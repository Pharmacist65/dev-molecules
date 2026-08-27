# Third-party notices

Dev Molecules keeps the interactive rendering boundary replaceable. This release adds only the following direct open-source packages for the new capability:

## Runtime

- **react 19.2.8** and **react-dom 19.2.8** — Meta Platforms, Inc. and affiliates — MIT License
  Project: <https://react.dev/>
  Purpose: the client application, component lifecycle, accessibility state,
  and DOM rendering boundary.
- **three 0.185.1** — Three.js Authors — MIT License
  Project: <https://github.com/mrdoob/three.js>
  Purpose: the shared WebGL molecular scene, perspective camera, depth-tested atom spheres and bond cylinders. The package has no runtime dependencies.
- **smiles-drawer 2.4.1** — Daniel Probst and Reymond Group — MIT License
  Project: <https://github.com/reymond-group/smilesDrawer>
  Purpose: deterministic client-side parsing and two-dimensional depiction of source-linked SMILES in Synthesis Atlas and Nomenclature Academy. It does not generate or validate synthetic routes.
- **chroma-js 2.6.0** — Gregor Aisch — BSD-3-Clause AND Apache-2.0 Licenses
  Project: <https://github.com/gka/chroma.js>
  Purpose: transitive color utility used by `smiles-drawer`.
- **ketcher-core 3.17.2**, **ketcher-react 3.17.2** and
  **ketcher-standalone 3.17.2** — EPAM Systems — Apache License 2.0
  Project: <https://github.com/epam/ketcher>
  Purpose: the route-lazy, browser-only chemical structure editor and its
  local binary-WASM structure-service provider in Lab. The integration does
  not send user-created structures to a Dev Molecules server.

## Development and verification

- **@playwright/test 1.62.1** — Microsoft Corporation — Apache License 2.0
  Project: <https://github.com/microsoft/playwright>
  Purpose: browser interaction, network, console, performance and visual acceptance tests. It is not shipped as application runtime code.
- **@types/three 0.185.4** — DefinitelyTyped contributors — MIT License
  Project: <https://github.com/DefinitelyTyped/DefinitelyTyped>
  Purpose: compile-time TypeScript declarations only.
- **ord-schema 0.3.99** — Open Reaction Database contributors — Apache License 2.0
  Project: <https://github.com/Open-Reaction-Database/ord-schema>
  Purpose: development-time decoding of Open Reaction Database protocol-buffer
  responses into normalized synthesis-discovery metadata. The decoder and raw
  provider payloads are not shipped in the public application artifact.

The lockfile pins exact direct versions. The generated public
`THIRD_PARTY_NOTICES.txt` appends the license/copyright files for the complete
non-development npm dependency closure, including Ketcher's transitive browser
packages. Both `npm audit` and `npm audit --omit=dev` report zero known
vulnerabilities for this dependency set as checked on 2026-08-23. Toolchain
upgrades are compatibility-tested rather than forced across the Vinext/worker
boundary.

## Data and scientific-content notices

### DrugCentral-derived catalog material

The catalog snapshot uses selected fields from **DrugCentral**, maintained by the University of New Mexico Translational Informatics Division. The defining publication is [DrugCentral: online drug compendium](https://doi.org/10.1093/nar/gkw993), *Nucleic Acids Research* 45(D1), D932–D939 (2017). Source files are linked in the checked snapshot and originate from [DrugCentral](https://drugcentral.org/).

DrugCentral database content is made available under the [Creative Commons Attribution-ShareAlike 4.0 International license (CC BY-SA 4.0)](https://creativecommons.org/licenses/by-sa/4.0/). Dev Molecules modifies that source material by selecting the configured FDA-list rows, joining same-ID structure records, normalizing fields, matching exact InChIKeys to PubChem, declaring exclusions, and generating compact search indexes, shards and coverage reports. No endorsement by DrugCentral or its contributors is implied.

The DrugCentral-derived portions of `scripts/catalog/source-snapshots/` and `public/catalog/` are redistributed under CC BY-SA 4.0. Recipients must preserve attribution, the license link and the modification notice; ShareAlike applies to adapted database material. This data license is separate from the source-code licensing status described in the README and does not itself grant a license to unrelated application code.

### PubChem structure records

Two- and three-dimensional SDF records are retrieved from [PubChem PUG REST](https://pubchem.ncbi.nlm.nih.gov/docs/pug-rest) by exact CID after identity matching. The catalog retains PubChem CID, source URL, retrieval metadata and content hashes. The public prototype's project-level decision is to bundle those exact source records with this policy notice so the static application can preserve identity-checked, fail-closed rendering. NCBI's [data and copyright policies](https://www.ncbi.nlm.nih.gov/home/about/policies/) apply; NCBI cannot grant rights in third-party submitted content. This distribution decision is not a representation that NCBI or Dev Molecules cleared rights in every third-party submission, and institutional adopters must perform their own review.

### Synthesis evidence discovery metadata

Automated synthesis discovery is run only for the public, checked Basic
Molecular Record catalog. User-created or private structures are not submitted
to PubChem, Europe PMC, the Open Reaction Database (ORD), or another discovery
provider by this pipeline.

PubChem and Europe PMC discovery results may include records whose underlying
publisher or submitter content has mixed or separately controlled rights. The
public synthesis snapshot therefore redistributes only normalized metadata,
identity/search audit fields, short factual locators and links back to the
source; it does not redistribute publisher article text, patent text, abstracts
or raw provider responses. A search match is not by itself evidence that a
reported route has been resolved, reviewed or licensed for reuse.

Normalized metadata derived from the [Open Reaction Database data
repository](https://github.com/Open-Reaction-Database/ord-data) is attributed
to the Open Reaction Database contributors and is redistributed under the
[Creative Commons Attribution-ShareAlike 4.0 International license (CC BY-SA
4.0)](https://creativecommons.org/licenses/by-sa/4.0/). Recipients must retain
that attribution and license link; ShareAlike applies to adaptations of that
ORD-derived data. An exact-product ORD match remains a candidate source until
the original publication or patent, exact source locator, identity scope and
route applicability have been independently resolved and reviewed.
