#!/usr/bin/env python3
"""Generate exact-identity, non-experimental 3D conformers for Molevren.

The caller supplies a deterministic JSON plan. Every input 2D record is checked
against its expected InChIKey before ETKDG embedding, and every generated output
is checked again before it is admitted to the result report. A failed entry is
recorded explicitly so the application can remain on its independent 2D view.
"""

from __future__ import annotations

import argparse
from datetime import datetime
import hashlib
import json
import math
import os
from pathlib import Path
import re
from typing import Any

import numpy as np
from rdkit import Chem, rdBase
from rdkit.Chem import AllChem


SCHEMA_VERSION = 1
GENERATOR = "RDKit ETKDGv3"
MMFF_VARIANT = "MMFF94s"
MAX_MINIMIZATION_ITERATIONS = 500
MAX_EMBEDDING_ATTEMPTS = 1000
MAX_RANDOM_SEED = 0x7FFFFFFF
INCHI_KEY_PATTERN = re.compile(r"^[A-Z]{14}-[A-Z]{10}-[A-Z]$")
NONPLANAR_RMS_THRESHOLD_ANGSTROM = 1e-3
COORDINATE_DISTANCE_THRESHOLD = 1e-6
SDF_COORDINATE_DECIMAL_PLACES = 4
SERIALIZED_RMS_TOLERANCE_ANGSTROM = 1e-8
PROVENANCE_PROPERTIES = (
    "PUBCHEM_COMPOUND_CID",
    "MOLEVREN_PROVENANCE",
    "MOLEVREN_GENERATOR",
    "MOLEVREN_GENERATOR_VERSION",
    "MOLEVREN_GENERATED_AT",
    "MOLEVREN_SOURCE_2D_ID",
    "MOLEVREN_SOURCE_2D_SHA256",
    "MOLEVREN_SOURCE_2D_CANONICAL_ISOMERIC_SMILES",
    "MOLEVREN_EXPECTED_INCHI_KEY",
    "MOLEVREN_RANDOM_SEED",
    "MOLEVREN_PARAMETERS_JSON",
    "MOLEVREN_MINIMIZATION_STATE",
    "MOLEVREN_MINIMIZATION_METHOD",
    "MOLEVREN_MINIMIZED_ENERGY_KCAL_MOL",
    "MOLEVREN_GEOMETRY_STATE",
    "MOLEVREN_NONPLANARITY_METRIC",
    "MOLEVREN_PLANE_OF_BEST_FIT_RMS_ANGSTROM",
    "MOLEVREN_EXPERIMENTAL_STRUCTURE",
    "MOLEVREN_CRYSTAL_STRUCTURE",
    "MOLEVREN_BIOACTIVE_CONFORMATION",
)
ENTRY_FAILURE_REASONS = frozenset({
    "blank_or_invalid_plan_path",
    "blank_or_invalid_output_path",
    "blank_source_2d_id",
    "catalog_source_2d_hash_mismatch",
    "disconnected_form_policy_unresolved",
    "etkdg_embedding_failed",
    "generated_conformer_coordinates_degenerate",
    "generated_conformer_coordinates_invalid",
    "generated_conformer_count_invalid",
    "generated_conformer_degenerate_planar_for_sp3_topology",
    "generated_conformer_not_3d",
    "generated_conformer_planarity_invalid",
    "generated_identity_mismatch",
    "generated_sdf_parse_failed",
    "generated_sdf_record_count_invalid",
    "generated_sdf_writer_unavailable",
    "generated_stereochemistry_unassigned",
    "generated_topology_mismatch",
        "invalid_expected_inchi_key",
        "invalid_plan_entry",
        "invalid_random_seed",
    "minimization_energy_unavailable",
    "minimization_failed",
    "output_path_must_end_in_sdf",
    "random_seed_does_not_match_identity_strategy",
    "serialized_generated_geometry_drift",
    "serialized_generated_identity_mismatch",
    "serialized_generated_provenance_mismatch",
    "serialized_generated_stereochemistry_unassigned",
    "serialized_generated_topology_mismatch",
    "source_2d_geometry_invalid",
    "source_2d_identity_mismatch",
    "source_2d_parse_failed",
    "source_2d_record_count_invalid",
    "source_2d_stereochemistry_unassigned",
    "source_and_output_paths_must_differ",
})


def _reject_duplicate_json_keys(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    value: dict[str, Any] = {}
    for key, item in pairs:
        if key in value:
            raise ValueError(f"Duplicate JSON key: {key}.")
        value[key] = item
    return value


def _reject_nonfinite_json_constant(value: str) -> None:
    raise ValueError(f"Non-finite JSON number is not allowed: {value}.")


def _load_json(path: Path) -> dict[str, Any]:
    value = json.loads(
        path.read_text(encoding="utf-8"),
        object_pairs_hook=_reject_duplicate_json_keys,
        parse_constant=_reject_nonfinite_json_constant,
    )
    if not isinstance(value, dict):
        raise ValueError("Conformer plan must be a JSON object.")
    return value


def _stable_json(value: Any) -> str:
    return json.dumps(
        value,
        allow_nan=False,
        indent=2,
        sort_keys=True,
        ensure_ascii=False,
    ) + "\n"


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _exact_inchi_key_without_coordinates(molecule: Chem.Mol) -> str:
    identity_copy = Chem.Mol(molecule)
    identity_copy.RemoveAllConformers()
    return Chem.MolToInchiKey(Chem.RemoveHs(identity_copy))


def _canonical_isomeric_smiles_without_coordinates(molecule: Chem.Mol) -> str:
    topology_copy = Chem.Mol(molecule)
    topology_copy.RemoveAllConformers()
    topology_copy = Chem.RemoveHs(topology_copy)
    Chem.AssignStereochemistry(topology_copy, cleanIt=True, force=True)
    return Chem.MolToSmiles(
        topology_copy,
        canonical=True,
        isomericSmiles=True,
        kekuleSmiles=False,
    )


def _has_unassigned_stereochemistry(molecule: Chem.Mol) -> bool:
    identity_copy = Chem.RemoveHs(Chem.Mol(molecule))
    Chem.AssignStereochemistry(identity_copy, cleanIt=True, force=True)
    potential_stereo = Chem.FindPotentialStereo(
        identity_copy,
        cleanIt=True,
        flagPossible=True,
    )
    return any(
        stereo.specified == Chem.StereoSpecified.Unspecified
        for stereo in potential_stereo
    ) or any(
        bond.GetStereo() == Chem.BondStereo.STEREOANY
        for bond in identity_copy.GetBonds()
    )


def _deterministic_seed(inchi_key: str) -> int:
    seed = int.from_bytes(
        hashlib.sha256(inchi_key.encode("ascii")).digest()[:4],
        byteorder="big",
        signed=False,
    ) & MAX_RANDOM_SEED
    return seed or 1


def _canonical_generated_at(value: Any) -> str:
    generated_at = str(value)
    if not generated_at.endswith("Z"):
        raise ValueError("generatedAt must be a canonical UTC timestamp ending in Z.")
    try:
        parsed = datetime.fromisoformat(generated_at.removesuffix("Z") + "+00:00")
    except ValueError as error:
        raise ValueError("generatedAt must be an ISO-8601 UTC timestamp.") from error
    if parsed.tzinfo is None or parsed.utcoffset() is None:
        raise ValueError("generatedAt must include a UTC offset.")
    return generated_at


def _resolved_plan_path(raw_path: Any, plan_directory: Path) -> Path:
    value = str(raw_path)
    if not value.strip() or "\x00" in value:
        raise ValueError("blank_or_invalid_plan_path")
    path = Path(value)
    return path.resolve() if path.is_absolute() else (plan_directory / path).resolve()


def _reported_output_path(raw_path: Any) -> str:
    value = str(raw_path)
    if not value.strip() or "\x00" in value:
        raise ValueError("blank_or_invalid_output_path")
    return Path(value).name


def _sanitized_failure_reason(error: Exception) -> str:
    if isinstance(error, (FileNotFoundError, PermissionError)):
        return "source_2d_unavailable"
    reason_code = str(error).partition(":")[0]
    if reason_code in ENTRY_FAILURE_REASONS:
        return reason_code
    if isinstance(error, (KeyError, TypeError, OverflowError)):
        return "invalid_plan_entry"
    if isinstance(error, OSError):
        return "conformer_generation_io_failed"
    return "conformer_generation_internal_error"


def _generation_parameters(random_seed: int) -> dict[str, Any]:
    return {
        "embeddingMethod": "ETKDGv3",
        "parameterBoundary": (
            "explicit_overrides_plus_pinned_rdkit_etkdgv3_defaults"
        ),
        "randomSeed": random_seed,
        "randomSeedStrategy": "sha256_inchi_key_first_31_bits_nonzero",
        "enforceChirality": True,
        "useRandomCoords": False,
        "useSmallRingTorsions": True,
        "useMacrocycleTorsions": True,
        "useMacrocycle14config": True,
        "useExpTorsionAnglePrefs": True,
        "useBasicKnowledge": True,
        "embedFragmentsSeparately": True,
        "numThreads": 1,
        "maxEmbeddingAttempts": MAX_EMBEDDING_ATTEMPTS,
        "clearConfs": True,
        "explicitHydrogens": True,
        "sdfCoordinateDecimalPlaces": SDF_COORDINATE_DECIMAL_PLACES,
        "nonplanarityMetric": "unweighted_all_atom_best_fit_plane_rms_angstrom",
        "nonplanarityThresholdAngstrom": NONPLANAR_RMS_THRESHOLD_ANGSTROM,
        "minimizationPreference": "MMFF94s_then_UFF",
        "maxMinimizationIterations": MAX_MINIMIZATION_ITERATIONS,
    }


def _finite_rounded_energy(value: float | None) -> float | None:
    if value is None or not math.isfinite(value):
        return None
    rounded = round(value, 10)
    return 0.0 if rounded == 0 else rounded


def _round_conformer_coordinates_for_sdf(molecule: Chem.Mol) -> None:
    if molecule.GetNumConformers() != 1:
        raise ValueError("generated_conformer_count_invalid")
    conformer = molecule.GetConformer()
    for index in range(molecule.GetNumAtoms()):
        position = conformer.GetAtomPosition(index)
        conformer.SetAtomPosition(
            index,
            tuple(
                round(component, SDF_COORDINATE_DECIMAL_PLACES)
                for component in (position.x, position.y, position.z)
            ),
        )


def _force_field_energy(force_field: Any) -> float | None:
    if force_field is None:
        return None
    try:
        return _finite_rounded_energy(float(force_field.CalcEnergy()))
    except Exception:
        return None


def _optimization_state(
    molecule: Chem.Mol,
) -> tuple[str, str | None, float | None]:
    mmff_failed = False
    if AllChem.MMFFHasAllMoleculeParams(molecule):
        try:
            status = AllChem.MMFFOptimizeMolecule(
                molecule,
                mmffVariant=MMFF_VARIANT,
                maxIters=MAX_MINIMIZATION_ITERATIONS,
            )
            if status in (0, 1):
                properties = AllChem.MMFFGetMoleculeProperties(
                    molecule,
                    mmffVariant=MMFF_VARIANT,
                )
                force_field = AllChem.MMFFGetMoleculeForceField(
                    molecule,
                    properties,
                ) if properties is not None else None
                energy = _force_field_energy(force_field)
                if energy is None:
                    raise ValueError("minimization_energy_unavailable")
                state = (
                    "mmff94s_converged"
                    if status == 0
                    else "mmff94s_iteration_limit"
                )
                return state, MMFF_VARIANT, energy
            mmff_failed = True
        except Exception:
            mmff_failed = True
    if AllChem.UFFHasAllMoleculeParams(molecule):
        try:
            status = AllChem.UFFOptimizeMolecule(
                molecule,
                maxIters=MAX_MINIMIZATION_ITERATIONS,
            )
            if status in (0, 1):
                force_field = AllChem.UFFGetMoleculeForceField(molecule)
                energy = _force_field_energy(force_field)
                if energy is None:
                    raise ValueError("minimization_energy_unavailable")
                state = "uff_converged" if status == 0 else "uff_iteration_limit"
                return state, "UFF", energy
        except Exception:
            pass
        raise ValueError("minimization_failed")
    if mmff_failed:
        raise ValueError("minimization_failed")
    return "embedded_not_minimized_no_supported_force_field", None, None


def _geometry_state(molecule: Chem.Mol) -> tuple[str, float]:
    if molecule.GetNumConformers() != 1:
        raise ValueError("generated_conformer_count_invalid")
    conformer = molecule.GetConformer()
    if not conformer.Is3D():
        raise ValueError("generated_conformer_not_3d")
    coordinates = [
        conformer.GetAtomPosition(index)
        for index in range(molecule.GetNumAtoms())
    ]
    if not coordinates or any(
        not all(math.isfinite(component) for component in (point.x, point.y, point.z))
        for point in coordinates
    ):
        raise ValueError("generated_conformer_coordinates_invalid")
    maximum_squared_distance = max(
        (
            (left.x - right.x) ** 2
            + (left.y - right.y) ** 2
            + (left.z - right.z) ** 2
        )
        for index, left in enumerate(coordinates)
        for right in coordinates[index + 1 :]
    ) if len(coordinates) > 1 else 0.0
    if maximum_squared_distance <= COORDINATE_DISTANCE_THRESHOLD**2:
        raise ValueError("generated_conformer_coordinates_degenerate")
    coordinate_matrix = np.asarray(
        [(point.x, point.y, point.z) for point in coordinates],
        dtype=np.float64,
    )
    centered_coordinates = coordinate_matrix - coordinate_matrix.mean(axis=0)
    covariance = (
        centered_coordinates.T @ centered_coordinates
    ) / len(coordinates)
    eigenvalues = np.linalg.eigvalsh(covariance)
    plane_of_best_fit = math.sqrt(max(float(eigenvalues[0]), 0.0))
    if not math.isfinite(plane_of_best_fit) or plane_of_best_fit < 0:
        raise ValueError("generated_conformer_planarity_invalid")
    heavy_molecule = Chem.RemoveHs(Chem.Mol(molecule))
    requires_nonplanarity = any(
        atom.GetHybridization() == Chem.HybridizationType.SP3
        for atom in heavy_molecule.GetAtoms()
    )
    if (
        requires_nonplanarity
        and plane_of_best_fit < NONPLANAR_RMS_THRESHOLD_ANGSTROM
    ):
        raise ValueError("generated_conformer_degenerate_planar_for_sp3_topology")
    return (
        "nonplanar_3d"
        if plane_of_best_fit >= NONPLANAR_RMS_THRESHOLD_ANGSTROM
        else "planar_topology_compatible_3d",
        round(plane_of_best_fit, 10),
    )


def _validate_serialized_output(
    path: Path,
    expected_inchi_key: str,
    expected_canonical_isomeric_smiles: str,
    expected_properties: dict[str, str],
) -> tuple[str, float]:
    supplier = Chem.SDMolSupplier(
        str(path),
        sanitize=True,
        removeHs=False,
        strictParsing=True,
    )
    if len(supplier) != 1:
        raise ValueError("generated_sdf_record_count_invalid")
    molecule = supplier[0]
    if molecule is None:
        raise ValueError("generated_sdf_parse_failed")
    if _exact_inchi_key_without_coordinates(molecule) != expected_inchi_key:
        raise ValueError("serialized_generated_identity_mismatch")
    if (
        _canonical_isomeric_smiles_without_coordinates(molecule)
        != expected_canonical_isomeric_smiles
    ):
        raise ValueError("serialized_generated_topology_mismatch")
    if _has_unassigned_stereochemistry(molecule):
        raise ValueError("serialized_generated_stereochemistry_unassigned")
    for key, expected in expected_properties.items():
        if not molecule.HasProp(key) or molecule.GetProp(key) != expected:
            raise ValueError(f"serialized_generated_provenance_mismatch:{key}")
    return _geometry_state(molecule)


def _normalize_sdf_trailing_whitespace(path: Path) -> None:
    serialized = path.read_text(encoding="utf-8")
    normalized = "\n".join(
        line.rstrip(" \t") for line in serialized.splitlines()
    ) + "\n"
    path.write_text(normalized, encoding="utf-8", newline="\n")


def _generate_entry(
    entry: dict[str, Any],
    generated_at: str,
    plan_directory: Path,
) -> dict[str, Any]:
    if any(
        not isinstance(entry.get(field_name), str)
        for field_name in (
            "inchiKey",
            "source2DPath",
            "source2DId",
            "outputPath",
        )
    ):
        raise ValueError("invalid_plan_entry")
    expected_inchi_key = str(entry["inchiKey"])
    if not INCHI_KEY_PATTERN.fullmatch(expected_inchi_key):
        raise ValueError("invalid_expected_inchi_key")
    raw_pubchem_cid = entry.get("pubChemCid")
    if (
        isinstance(raw_pubchem_cid, bool)
        or not isinstance(raw_pubchem_cid, int)
        or raw_pubchem_cid <= 0
    ):
        raise ValueError("invalid_plan_entry")
    pubchem_cid = raw_pubchem_cid
    source_2d_path = _resolved_plan_path(entry["source2DPath"], plan_directory)
    output_path = _resolved_plan_path(entry["outputPath"], plan_directory)
    reported_output_path = _reported_output_path(entry["outputPath"])
    if source_2d_path == output_path:
        raise ValueError("source_and_output_paths_must_differ")
    if output_path.suffix.lower() != ".sdf":
        raise ValueError("output_path_must_end_in_sdf")
    source_2d_id = entry["source2DId"]
    if not source_2d_id.strip():
        raise ValueError("blank_source_2d_id")
    raw_random_seed = entry.get("randomSeed")
    if isinstance(raw_random_seed, bool) or not isinstance(raw_random_seed, int):
        raise ValueError("invalid_random_seed")
    random_seed = raw_random_seed
    if random_seed != _deterministic_seed(expected_inchi_key):
        raise ValueError("random_seed_does_not_match_identity_strategy")
    source_2d_sha256 = _sha256(source_2d_path)
    catalog_source_prefix = "catalog-structure:2d:"
    if (
        source_2d_id.startswith(catalog_source_prefix)
        and source_2d_id.removeprefix(catalog_source_prefix) != source_2d_sha256
    ):
        raise ValueError("catalog_source_2d_hash_mismatch")

    source_supplier = Chem.SDMolSupplier(
        str(source_2d_path),
        sanitize=True,
        removeHs=False,
        strictParsing=True,
    )
    if len(source_supplier) != 1:
        raise ValueError("source_2d_record_count_invalid")
    molecule = source_supplier[0]
    if molecule is None:
        raise ValueError("source_2d_parse_failed")
    if molecule.GetNumConformers() != 1 or molecule.GetConformer().Is3D():
        raise ValueError("source_2d_geometry_invalid")
    if len(Chem.GetMolFrags(molecule)) != 1:
        raise ValueError("disconnected_form_policy_unresolved")
    if _exact_inchi_key_without_coordinates(molecule) != expected_inchi_key:
        raise ValueError("source_2d_identity_mismatch")
    if _has_unassigned_stereochemistry(molecule):
        raise ValueError("source_2d_stereochemistry_unassigned")
    source_canonical_isomeric_smiles = (
        _canonical_isomeric_smiles_without_coordinates(molecule)
    )

    molecule.RemoveAllConformers()
    molecule = Chem.AddHs(molecule)
    parameters = AllChem.ETKDGv3()
    parameters.randomSeed = random_seed
    parameters.enforceChirality = True
    parameters.useRandomCoords = False
    parameters.useSmallRingTorsions = True
    parameters.useMacrocycleTorsions = True
    parameters.useMacrocycle14config = True
    parameters.useExpTorsionAnglePrefs = True
    parameters.useBasicKnowledge = True
    parameters.embedFragmentsSeparately = True
    parameters.numThreads = 1
    parameters.maxIterations = MAX_EMBEDDING_ATTEMPTS
    parameters.clearConfs = True
    embed_status = AllChem.EmbedMolecule(molecule, parameters)
    if embed_status != 0 or molecule.GetNumConformers() != 1:
        raise ValueError(f"etkdg_embedding_failed:{embed_status}")

    _geometry_state(molecule)
    minimization_state, minimization_method, energy = _optimization_state(molecule)
    _round_conformer_coordinates_for_sdf(molecule)
    geometry_state, plane_of_best_fit = _geometry_state(molecule)
    if _exact_inchi_key_without_coordinates(molecule) != expected_inchi_key:
        raise ValueError("generated_identity_mismatch")
    if (
        _canonical_isomeric_smiles_without_coordinates(molecule)
        != source_canonical_isomeric_smiles
    ):
        raise ValueError("generated_topology_mismatch")
    if _has_unassigned_stereochemistry(molecule):
        raise ValueError("generated_stereochemistry_unassigned")

    generation_parameters = _generation_parameters(random_seed)
    molecule.SetProp("_Name", f"Molevren computed conformer | {expected_inchi_key}")
    for property_name in molecule.GetPropNames(
        includePrivate=False,
        includeComputed=False,
    ):
        molecule.ClearProp(property_name)
    # Renderer contracts use the exact catalog PubChem CID as the portable
    # identity gate. The geometry is still locally generated and is never
    # represented as a PubChem-produced conformer.
    molecule.SetProp("PUBCHEM_COMPOUND_CID", str(pubchem_cid))
    molecule.SetProp("MOLEVREN_PROVENANCE", "computed")
    molecule.SetProp("MOLEVREN_GENERATOR", GENERATOR)
    molecule.SetProp("MOLEVREN_GENERATOR_VERSION", rdBase.rdkitVersion)
    molecule.SetProp("MOLEVREN_GENERATED_AT", generated_at)
    molecule.SetProp("MOLEVREN_SOURCE_2D_ID", source_2d_id)
    molecule.SetProp("MOLEVREN_SOURCE_2D_SHA256", source_2d_sha256)
    molecule.SetProp(
        "MOLEVREN_SOURCE_2D_CANONICAL_ISOMERIC_SMILES",
        source_canonical_isomeric_smiles,
    )
    molecule.SetProp("MOLEVREN_EXPECTED_INCHI_KEY", expected_inchi_key)
    molecule.SetProp("MOLEVREN_RANDOM_SEED", str(random_seed))
    molecule.SetProp(
        "MOLEVREN_PARAMETERS_JSON",
        json.dumps(
            generation_parameters,
            allow_nan=False,
            separators=(",", ":"),
            sort_keys=True,
        ),
    )
    molecule.SetProp("MOLEVREN_MINIMIZATION_STATE", minimization_state)
    molecule.SetProp(
        "MOLEVREN_MINIMIZATION_METHOD",
        minimization_method or "none",
    )
    molecule.SetProp(
        "MOLEVREN_MINIMIZED_ENERGY_KCAL_MOL",
        f"{energy:.10f}" if energy is not None else "unavailable",
    )
    molecule.SetProp("MOLEVREN_GEOMETRY_STATE", geometry_state)
    molecule.SetProp(
        "MOLEVREN_NONPLANARITY_METRIC",
        "unweighted_all_atom_best_fit_plane_rms_angstrom",
    )
    molecule.SetProp(
        "MOLEVREN_PLANE_OF_BEST_FIT_RMS_ANGSTROM",
        f"{plane_of_best_fit:.10f}",
    )
    molecule.SetProp("MOLEVREN_EXPERIMENTAL_STRUCTURE", "false")
    molecule.SetProp("MOLEVREN_CRYSTAL_STRUCTURE", "false")
    molecule.SetProp("MOLEVREN_BIOACTIVE_CONFORMATION", "false")

    output_path.parent.mkdir(parents=True, exist_ok=True)
    temporary_path = output_path.with_name(f".{output_path.name}.tmp-{os.getpid()}")
    expected_properties = {
        property_name: molecule.GetProp(property_name)
        for property_name in PROVENANCE_PROPERTIES
        if molecule.HasProp(property_name)
    }
    try:
        writer = Chem.SDWriter(str(temporary_path))
        if writer is None:
            raise ValueError("generated_sdf_writer_unavailable")
        writer.SetKekulize(False)
        writer.SetProps(list(PROVENANCE_PROPERTIES))
        writer.write(molecule)
        writer.close()
        _normalize_sdf_trailing_whitespace(temporary_path)
        serialized_geometry_state, serialized_plane_of_best_fit = (
            _validate_serialized_output(
                temporary_path,
                expected_inchi_key,
                source_canonical_isomeric_smiles,
                expected_properties,
            )
        )
        if (
            serialized_geometry_state != geometry_state
            or abs(serialized_plane_of_best_fit - plane_of_best_fit)
            > SERIALIZED_RMS_TOLERANCE_ANGSTROM
        ):
            raise ValueError("serialized_generated_geometry_drift")
        os.replace(temporary_path, output_path)
    finally:
        temporary_path.unlink(missing_ok=True)

    structure_hash = _sha256(output_path)
    return {
        "inchiKey": expected_inchi_key,
        "outputPath": reported_output_path,
        "sha256": structure_hash,
        "structureHash": structure_hash,
        "source2DId": source_2d_id,
        "source2DSha256": source_2d_sha256,
        "source2DCanonicalIsomericSmiles": source_canonical_isomeric_smiles,
        "generator": GENERATOR,
        "generatorVersion": rdBase.rdkitVersion,
        "generatedAt": generated_at,
        "parameters": generation_parameters,
        "energyMinimizationState": minimization_state,
        "minimizationMethod": minimization_method,
        "minimizedEnergy": energy,
        "minimizedEnergyUnit": "kcal/mol" if energy is not None else None,
        "geometryState": geometry_state,
        "nonplanarityMetric": (
            "unweighted_all_atom_best_fit_plane_rms_angstrom"
        ),
        "planeOfBestFitRmsAngstrom": plane_of_best_fit,
        "experimentalStructure": False,
        "crystalStructure": False,
        "bioactiveConformation": False,
    }


def generate(plan_path: Path, report_path: Path) -> int:
    plan = _load_json(plan_path)
    if plan.get("schemaVersion") != SCHEMA_VERSION:
        raise ValueError("Unsupported conformer-plan schema version.")
    required_version = str(plan.get("requiredRdkitVersion", ""))
    if required_version != rdBase.rdkitVersion:
        raise ValueError(
            "RDKit version mismatch: "
            f"expected {required_version}, got {rdBase.rdkitVersion}."
        )
    generated_at = _canonical_generated_at(plan.get("generatedAt", ""))
    entries = plan.get("entries")
    if not isinstance(entries, list):
        raise ValueError("Conformer plan entries must be an array.")
    if not all(isinstance(entry, dict) for entry in entries):
        raise ValueError("Every conformer plan entry must be a JSON object.")

    plan_directory = plan_path.resolve().parent
    resolved_report_path = report_path.resolve()
    preflight: list[tuple[dict[str, Any], str, Path]] = []
    seen_output_paths: set[Path] = set()
    seen_inchi_keys: set[str] = set()
    for raw_entry in entries:
        inchi_key = str(raw_entry.get("inchiKey", ""))
        if not INCHI_KEY_PATTERN.fullmatch(inchi_key):
            raise ValueError(f"Invalid or blank planned InChIKey: {inchi_key!r}.")
        if inchi_key in seen_inchi_keys:
            raise ValueError(f"Duplicate planned InChIKey: {inchi_key}.")
        seen_inchi_keys.add(inchi_key)
        output_path = _resolved_plan_path(
            raw_entry.get("outputPath", ""),
            plan_directory,
        )
        if output_path in seen_output_paths:
            raise ValueError(f"Duplicate conformer output path: {output_path.name}.")
        if output_path == resolved_report_path:
            raise ValueError("A conformer output path cannot overwrite its report.")
        seen_output_paths.add(output_path)
        preflight.append((raw_entry, inchi_key, output_path))

    generated: list[dict[str, Any]] = []
    failures: list[dict[str, str]] = []
    for raw_entry, inchi_key, output_path in sorted(
        preflight,
        key=lambda item: item[1],
    ):
        # One failed molecule must remain a typed 2D fallback.
        try:
            generated.append(
                _generate_entry(raw_entry, generated_at, plan_directory)
            )
        except Exception as error:
            output_path.unlink(missing_ok=True)
            failures.append({
                "inchiKey": inchi_key,
                "reason": _sanitized_failure_reason(error),
            })

    report = {
        "schemaVersion": SCHEMA_VERSION,
        "generator": GENERATOR,
        "generatorVersion": rdBase.rdkitVersion,
        "generatedAt": generated_at,
        "requestedCount": len(entries),
        "generatedCount": len(generated),
        "failureCount": len(failures),
        "entries": generated,
        "failures": failures,
    }
    resolved_report_path.parent.mkdir(parents=True, exist_ok=True)
    temporary_report_path = resolved_report_path.with_name(
        f".{resolved_report_path.name}.tmp-{os.getpid()}"
    )
    try:
        temporary_report_path.write_text(_stable_json(report), encoding="utf-8")
        os.replace(temporary_report_path, resolved_report_path)
    finally:
        temporary_report_path.unlink(missing_ok=True)
    print(_stable_json({key: report[key] for key in (
        "generator",
        "generatorVersion",
        "generatedAt",
        "requestedCount",
        "generatedCount",
        "failureCount",
    )}), end="")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--plan", required=True, type=Path)
    parser.add_argument("--report", required=True, type=Path)
    arguments = parser.parse_args()
    return generate(arguments.plan, arguments.report)


if __name__ == "__main__":
    raise SystemExit(main())
