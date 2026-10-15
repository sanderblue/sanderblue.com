# Rime Cabin price check

A prompt for a second opinion on the cost estimate at https://sanderblue.com/mountain-house/. It asks a reviewer with web search to re-price the parts list against 2026 sources, check the arithmetic, the quantities, the hired trades, the allowances, and what is missing, and to hand back corrections keyed by catalog ID so they drop straight into `cabin/src/model.json`.

**How to use.** Paste everything from the line below to the end of this file into a fresh session that has web search. Best is Claude Code opened on this repo, where the reviewer can read `cabin/src/model.json`, run `npm run cabin:check`, and export the CSV. In a plain chat, download the parts list (CSV) and data model (JSON) from the page's Downloads section with "As drawn" selected and attach both. The appendix carries enough of the numbers that the prompt works with nothing attached. Refresh the appendix after a model change with `node cabin/prompts/price-check.mjs`. The task text quotes rev F figures by hand; when the appendix shows a later rev, the appendix wins.

---

You are checking the cost estimate for the Rime Cabin, an owner-built mountain cabin. Your job is prices, quantities, fees and missing scope. Not design.

## What you are checking

- Rime Cabin, rev F dated 2026-10-10. A 24 x 32 ft one-story house (768 sq ft) with a 17 ft tall south glass wall, plus an attached 24 x 16 ft garage (384 sq ft), a covered area on the north side and a covered entry on the west. Details in appendix G.
- Summit County, Colorado, Breckenridge area, 9,500 to 10,000 ft. The lot is not chosen. The build starts in May 2027: two people full time for 90 working days, with four days of hired framing help. Hired trades only for garage concrete, propane, electrician sign-off, the overhead door, the surveyor and the engineer.
- Prices are 2026 dollars for materials delivered to a mountain site. The owner does most of the labor, so most lines are material only. The total is not a turnkey contractor price. Do not compare its $233 per sq ft with Summit County contractor-built homes; do say what the owner's labor is worth if a line is normally sold installed.
- The estimate: 175 lines, $197,297 in parts and services, 7.5% sales tax on $167,101 of taxable materials, a 10% surprise fund on the subtotal, total $230,813. House share $178,898, garage share $51,915. The Lean build preset is $184,844. Appendix A has the full block.
- Only 12 lines are marked as compared with a 2026 source. Every other price is the author's estimate.
- Inputs: the parts list CSV (columns ID, System, Item, Spec, Qty, Unit, Unit cost, Line total, Who, Supplier, Lead time, Sheet, Price basis, Notes) and the model JSON (`catalog.items` has each line's unit price `p`, unit `u`, `by`, `sup`, `lead`, `chk`, `allow`, `note`; `catalog.site` the excluded site costs; `rates` the tax and contingency; `logistics.valueEng` the savings list). If you have the repo: `npm run cabin:check` and `npm run cabin:check -- --lean` print the totals.

## Rules

- Cost only. Do not resize members, change specs or change choices. If a price depends on a spec question, say so and price the spec as written.
- Report only. Do not edit model.json or any other file, do not run the cabin build, and do not commit. The owner applies the corrections, rebuilds the page and commits.
- Use 2026 prices. Prefer, in this order: a supplier or manufacturer price list, a big-box or distributor SKU page, a Front Range or Summit County lumberyard or dealer, a county or utility fee schedule, a trade association survey. Treat aggregator cost blogs as weak evidence and say so when you have nothing better.
- Cite the URL and the date you looked at it for every number. Say whether the price is material only or installed. When a source gives installed cost and the line is material only, say what share you took as material and why.
- "Could not verify" is an allowed answer. A guess presented as a finding is not.
- Report in dollars, in the model's unit (lf, sf, sheet, ea, cy, bag, lot, drop), so a change can be typed into model.json.
- Work in the order below and finish each task before starting the next. If you run out of room, the earlier tasks matter more. Keep the required row formats; the tables are the deliverable.

## Tasks

1. **Reproduce the arithmetic.** From the CSV or appendix A, re-add parts and services, taxable materials, tax, subtotal, surprise fund, total, garage share and house per sq ft. Confirm or correct each figure. Note that tax is applied only to lines categorized as materials (Who is You or Buy, not rentals or Pro), so Pro lines that include materials (garage concrete $5,760, propane tank $3,400, overhead door $2,400) carry no tax. Say whether that matches how Colorado contractors bill. One more: removing the garage drops the total by $55,063 (appendix F) while the garage share is $51,915. The cause to confirm: switching the garage off also switches off the covered entry, whose deck, pier footings, hold-down piers, snow rail and one delivery drop sit in the Foundation, Exterior, Roofing and General groups, not under Garage, while a plain entry porch ($1,400) comes back. So the garage share understates what the garage and covered entry cost together by about $3,100. Say whether the page should state the garage share differently.

2. **Unit price audit of the biggest lines.** The 30 lines in appendix B are 55% of parts and services. For each one find a 2026 price. One row per line:

   `ID | model price and unit | found range | source URL, date | material or installed | verdict: in range / low / high / could not verify | suggested price | confidence high, medium or low | change to the line total`

   Then work down appendix B2 ($800 and up), biggest first, as far as you can with real sources, and say where you stopped. For each row say what kind of seller the price assumes (lumberyard, big box, dealer, online).

3. **Re-verify the 12 checked lines.** Appendix C lists them with the page's source list. Several of those sources are aggregator blogs (latestcost.com appears four times, plus thepricer.org, resident.com, modernize.com). Rate each existing source strong or weak, find a stronger source for every weak one, and say whether the price still holds. Name any line that should lose its checked mark, and any estimate line you now have a strong source for that should gain one.

4. **Hired trades and allowances.** Appendix D lists every Pro line and every allowance. Price each at Summit County 2026 rates. Check especially:
   - Structural engineer $2,200 for a stamped set with 100 psf snow, steel glass-wall posts, hold-downs and pier footings.
   - Building permit and plan review $2,400 plus a $400 garage share. Find the Summit County fee schedule: permit, plan check, and anything else collected at permit (impact fees, construction use tax, workforce or affordable housing fees, road or driveway permits). If the county collects a use tax on building materials at permit instead of sales tax at the register, say how that changes task 1.
   - Surveyor $650. Builder's risk $700 for about five months on a $230k owner-build. Electrician $1,900 for the service hookup, panel and inspection.
   - Garage footing, stem wall and slab at $15 per sq ft, formed, poured and finished at altitude. Landing and steps $420. Overhead door with opener, installed, $2,400.
   - Propane: 500 gal tank $3,400 to buy, versus a lease; buried line $14 per ft; gas fitter $650.
   - Delivery at $175 per drop for 9 drops to a mountain site, from a lumberyard, roofing supplier and window dealer.
   - Rentals against the 90 working day schedule: auger and mini-excavator 2 days $900, telehandler and scaffold $1,400, dumpster $650, portable toilet 6 months $900, temporary power $450.
   - Hired framing help, two people for four days, $3,000.
   - The small-parts allowances (fasteners $950, tape and flashing $380, trim $1,000 and $800, air sealing $450, drywall finishing $380, plumbing small parts $220, door hardware $180, garage connectors $450). Say whether each covers what it names.

5. **Quantity spot-check.** Quantities come from the 3D model with per-line waste factors. For ten of the biggest lines, recompute the quantity from appendix G and say whether it looks right, whether waste is included, and flag anything off by more than 15%: house rafters 1,272 lf and garage rafters 927 lf; standing seam 1,316 sf house and 1,005 sf garage; ZIP-R 43 sheets; board and batten 1,207 sf house and 705 sf garage; cedar soffit 457 sf house and 574 sf garage; ready-mix 17 cy for the piers and footings; footing forms 307 sf; rebar 938 lf; floor beam 148 lf; flooring 741 sf for a 768 sq ft house.

6. **Missing scope.** List everything that costs money and has no line. Confirm or dismiss each of these, then add your own:
   - Soils report, septic design, well permit, water rights or augmentation, driveway or access permit and culvert.
   - County fees collected at permit that task 4 found.
   - Energy compliance: REScheck or HERS, blower-door test.
   - Erosion control, revegetation, final grading, backfill around the piers, gravel under the skirt.
   - Wildfire or WUI code items if Summit County or the state has adopted one: ember-resistant vents, defensible space.
   - Electrical service extension or tap fee (listed as a site cost; confirm it belongs there), propane first fill, appliance delivery.
   - Gutters or snow management beyond the north-eave snow rail; tempering for the large glass; inspection re-visit fees.
   - The build itself: tools and consumables for a four-month build, lodging, fuel and travel for two people, winter protection if dry-in slips past September.
   For each confirmed gap give a suggested allowance, its basis, and whether it belongs in the total or with the site costs.

7. **Excluded site costs.** Appendix E has the page's ranges. Give Summit County 2026 ranges with sources for septic (page says $6,000 to $25,000), a drilled well with pump (page says $8,000 to $32,000), the cistern alternative, a power line extension, and a driveway. Report these as a separate low and high figure so nobody reads $230,813 as the whole project.

8. **Systemic factors.**
   - Sales tax: the rate on building materials for unincorporated Summit County versus Breckenridge, Frisco, Silverthorne and Dillon, and where materials are likely bought (Front Range big box versus a mountain lumberyard).
   - Is a 10% surprise fund reasonable for a first-time owner-builder at 9,500 ft with no lot chosen? Give the range you would use and why.
   - Escalation from 2026 prices to a 2027 build for lumber, engineered wood, steel roofing, steel posts and hangers, windows, concrete and propane equipment, including tariff exposure.
   - Anything in Summit County or Colorado that moves cost class-wide: a county snow load above 100 psf at that elevation forces the 150 psf option (+$16,060), the adopted energy code year, a wildfire code.

9. **Output.** End with these, in this order:
   - **Corrections table**, one row per line you changed: `ID | old p | new p | chk true or false | one-line source note`. This goes straight into model.json, so only include lines where you have a source.
   - **Replacement source list** for the page's "Prices checked" section: `title | URL | which IDs it supports`.
   - **Missing-scope table**: `item | suggested allowance | basis | in the total or site`.
   - **Revised total** under the same arithmetic: low, likely and high, with the three biggest reasons the number moved. The same for the Lean build if your corrections move it by more than $5,000.
   - **Site costs** low, likely and high.
   - **Five local quotes** to get before buying land, in priority order, with what to ask for.

## Appendix: the numbers as of rev F (2026-10-10), "As drawn" choices

Regenerate this appendix after any model change with `node cabin/prompts/price-check.mjs`. `npm run cabin:check` prints the same totals, and the parts list CSV comes from the page's Downloads section.

### A. Totals and rates

| | |
|---|---|
| Parts and services (175 lines) | $197,297 |
| of which materials (taxable) | $167,101 |
| of which hired trades, engineer, permit, insurance | $24,321 |
| of which rentals | $4,300 |
| of which delivery | $1,575 |
| Sales tax on materials, 7.5% | $12,533 |
| Subtotal | $209,830 |
| Surprise fund, 10% of subtotal | $20,983 |
| **Estimated total** | **$230,813** |
| Garage share (its own tax and contingency) | $51,915 |
| House share | $178,898 |
| Per sq ft, house only (32 x 24 = 768 sf) | $233 |
| Lean build preset (propane only, 2 glass bays, ribbed roof, no washer-dryer, no paid help, no covered area or entry) | $184,844, $195/sf |

Tax note in the model: "Sales tax on materials, about 7.5% (my estimate; Colorado state plus county and town rates vary by lot)"

### B. The 30 biggest lines (55% of parts and services)

| # | ID | Item | Qty | Unit price | Line | Who | Basis |
|---|---|---|---|---|---|---|---|
| 1 | ROF-IJ16 | Rafter, 16 in I-joist (Heavy flange, 12 or 16 in o.c. by snow load) | 1,272 lf | $7.2/lf | $9,158 | You | estimate |
| 2 | RFG-SEAM | Standing seam panels (24 ga steel, snap-lock, clips) | 1,316 sf | $5.9/sf | $7,764 | You | checked |
| 3 | OPN-FIX77 | Fixed window, 76 3/4 x 72 in (Low-E, argon, U 0.30 or better) | 6 ea | $1,250/ea | $7,500 | Buy | checked |
| 4 | GAR-IJ16 | Rafter, 16 in I-joist (Same rafters as the house, 12 or 16 in o.c. by snow load) | 927 lf | $7.2/lf | $6,674 | You | estimate |
| 5 | GAR-SEAM | Standing seam panels (Standing seam to match the house, run straight on from the house panels) | 1,005 sf | $5.9/sf | $5,930 | You | estimate |
| 6 | GAR-CONC | Garage footing, stem wall and slab (Footing and 8 in stem wall down to frost (48 in), 4 in slab on gravel sloped to the door, top 9 in above grade so two steps reach the house floor) | 384 sf | $15/sf | $5,760 | Pro | estimate |
| 7 | WAL-ZIPR | Wall sheathing, ZIP System R-6 (1 in foam bonded to 7/16 OSB, taped) | 43 sheet | $105/sheet | $4,515 | You | checked |
| 8 | FND-CONC | Ready-mix concrete (4,000 psi, air-entrained) | 17 cy | $260/cy | $4,420 | Buy | estimate |
| 9 | FND-FTG | Footing form (bell or pad) (Plastic bell forms 24 to 48 in, or a formed pad: square pads, combined pads where two piers share one, and hold-down pads sized for uplift) | 307 sf | $14/sf | $4,298 | You | estimate |
| 10 | EXT-BB | Fiber-cement board and batten (Primed panels and battens) | 1,207 sf | $3.1/sf | $3,742 | You | estimate |
| 11 | GAR-SOFFIT | Soffit, cedar (Cedar, to match the house) | 574 sf | $6/sf | $3,444 | You | estimate |
| 12 | MEC-TANK | Propane tank, 500 gal (ASME, set on a pad and regulated by the propane company) | 1 lot | $3,400/lot | $3,400 | Pro | estimate |
| 13 | FLR-BEAM | Floor beam, LVL (3-ply 1 3/4 x 11 7/8, flush with the joists) | 148 lf | $22/lf | $3,256 | You | estimate |
| 14 | RFG-SNOW | Snow retention rail (Two rows of clamp-on snow rail (S-5 type) above the north eave, house and garage, so sliding snow does not land on the covered area or pile on the garage wall) | 119 lf | $26/lf | $3,094 | You | estimate |
| 15 | GEN-HELP | Hired help for walls and roof (Two people, four days) | 1 lot | $3,000/lot | $3,000 | Pro | estimate |
| 16 | WAL-LSL | Stud, LSL 1 3/4 x 5 1/2 (For walls taller than 12 ft) | 658 lf | $4.2/lf | $2,764 | You | estimate |
| 17 | RFG-SOFFIT | Soffit, cedar (Vented at both eaves to feed the cold-roof channel) | 457 sf | $6/sf | $2,742 | You | estimate |
| 18 | GAR-EPOST | Post, covered entry (8x8 Douglas fir-larch No. 1, about 18 ft, uplift-rated post base and beam cap) | 3 ea | $820/ea | $2,460 | You | estimate |
| 19 | GAR-ODOOR | Overhead door, 10 x 8 ft, with opener (Dark flush steel, not insulated) | 1 ea | $2,400/ea | $2,400 | Pro | estimate |
| 20 | GEN-PERMIT | Building permit and plan review (Varies a lot by county) | 1 lot | $2,400/lot | $2,400 | Pro | estimate |
| 21 | GEN-ENG | Structural engineer (Snow load, piers, rafters, south wall, stamp) | 1 lot | $2,200/lot | $2,200 | Pro | estimate |
| 22 | GAR-BB | Fiber-cement board and batten (Same fiber-cement board and batten and color as the house) | 705 sf | $3.1/sf | $2,186 | You | estimate |
| 23 | FLR-JOIST | Floor joist, I-joist (11 7/8 in at 16 in o.c., TJI 210 or equal (checked on S-301 with the bedroom wall and loft load)) | 572 lf | $3.6/lf | $2,059 | You | checked |
| 24 | MEC-FURN | Propane wall furnace (Direct vent, about 21,500 BTU, modulating) | 1 ea | $2,049/ea | $2,049 | Buy | checked |
| 25 | INT-FLOOR | Flooring (Rigid-core vinyl plank, wood look) | 741 sf | $2.6/sf | $1,927 | You | estimate |
| 26 | GAR-CLR | Fixed window, 48 x 39 in (Clerestory high on the south wall) | 4 ea | $480/ea | $1,920 | Buy | estimate |
| 27 | ELE-ELEC | Electrician (Service hookup, panel, inspection) | 1 lot | $1,900/lot | $1,900 | Pro | estimate |
| 28 | MEC-STOVE | Wood stove (EPA certified, small firebox) | 1 ea | $1,900/ea | $1,900 | Buy | checked |
| 29 | GAR-HEAT | Propane wall heater, direct vent (About 30,000 BTU/h, sealed combustion, burner 18 in or more above the floor, on the south wall, vent kit with snorkel) | 1 ea | $1,900/ea | $1,900 | Buy | estimate |
| 30 | FND-SKIRT | Perimeter skirt (Treated frame set outside the piers, fiber-cement panel, screened vents, access door; tucks under the siding drip cap) | 114 lf | $16/lf | $1,824 | You | estimate |

### B2. The next 44 lines, $800 and up

- INT-BUILTIN: Built-ins, 1 lot at $1,650/lot = $1,650 (You)
- FIX-SHOWER: Shower, 1 lot at $1,650/lot = $1,650 (You)
- ROF-DECK2: Roof deck, upper, 43 sheet at $38/sheet = $1,634 (You)
- FLR-SUB: Subfloor, 26 sheet at $62/sheet = $1,612 (You)
- GEN-DELIV: Delivery charges, 9 drop at $175/drop = $1,575 (Buy)
- ENV-ROOF: Roof insulation, about R-60, 100 bag at $15/bag = $1,500 (You)
- INT-CAB: Kitchen cabinets and counter, 1 lot at $1,500/lot = $1,500 (You)
- ENV-WALL: Wall insulation, R-23, 1,025 sf at $1.45/sf = $1,486 (You)
- INT-PINE: Pine tongue-and-groove ceiling, 568 sf at $2.6/sf = $1,477 (You)
- OPN-TOPAWN: Awning window, 76 3/4 x 28 in, 2 ea at $720/ea = $1,440 (Buy)
- OPN-FIX38: Fixed window, 38 3/8 x 72 in, 2 ea at $700/ea = $1,400 (Buy)
- GEN-LIFT: Telehandler and scaffold rental, 1 lot at $1,400/lot = $1,400 (You)
- OPN-ENTRY: Entry door, 36 in, 1 ea at $1,350/ea = $1,350 (Buy)
- FIX-WD: Washer-dryer combo, 1 ea at $1,350/ea = $1,350 (Buy)
- FLR-INS: Floor insulation, R-44, 85 bag at $15/bag = $1,275 (You)
- WAL-POST: Post between glass bays, steel, 33 lf at $38/lf = $1,254 (Buy)
- GAR-DECK2: Roof deck, upper, 33 sheet at $38/sheet = $1,254 (You)
- EXT-EDECK: Entry deck, 1 lot at $1,250/lot = $1,250 (You)
- EXT-CPOST: Post, covered area, 4 ea at $310/ea = $1,240 (You)
- ROF-DECK1: Roof deck, lower, 41 sheet at $30/sheet = $1,230 (You)
- FND-TUBE: Form tube, 35 ea at $32/ea = $1,120 (You)
- INT-DW: Drywall, 1/2 in, 62 sheet at $18/sheet = $1,116 (You)
- FLR-BELLY: Belly board, 26 sheet at $42/sheet = $1,092 (You)
- OPN-BARN: Sliding barn door, 3 ea at $360/ea = $1,080 (Buy)
- ELE-WIRE: Cable, 14/2 and 12/2, 1,239 lf at $0.85/lf = $1,053 (You)
- FND-CAP: Beam-to-pier cap, uplift rated, 18 ea at $58/ea = $1,044 (You)
- OPN-EGR: Casement, 36 x 48 in, egress, 2 ea at $520/ea = $1,040 (Buy, checked)
- FND-REBAR: Rebar, #4, 938 lf at $1.1/lf = $1,032 (You)
- WAL-STUD6: Stud, 2x6, 108 ea at $9.5/ea = $1,026 (You)
- EXT-TRIM: Trim, corners, flashing, caulk, 1 lot at $1,000/lot = $1,000 (You)
- FND-HD: Hold-down, 14 ea at $68/ea = $952 (You)
- WAL-FASTEN: Nails, screws, framing connectors, 1 lot at $950/lot = $950 (You)
- GAR-TRIM: Fascia, drip edge and rake trim, 94 lf at $10/lf = $940 (You)
- GAR-DECK: Roof deck, lower, 31 sheet at $30/sheet = $930 (You)
- GAR-SHEATH: Wall sheathing, ZIP System, 24 sheet at $38/sheet = $912 (You)
- FND-AUGER: Auger and mini-excavator rental, 1 lot at $900/lot = $900 (You)
- MEC-HEARTH: Hearth pad and heat shield, 1 lot at $900/lot = $900 (You)
- GEN-TOILET: Portable toilet, 1 lot at $900/lot = $900 (You)
- ROF-BLOCK: Blocking panel at bearings, 98 ea at $9/ea = $882 (You)
- MEC-WH: Tankless water heater, 1 ea at $863/ea = $863 (Buy, checked)
- FIX-FRIDGE: Refrigerator, 1 ea at $850/ea = $850 (Buy)
- MEC-CHIM: Insulated chimney, 6 in, 2 ea at $420/ea = $840 (You, checked)
- MEC-CHIMKIT: Chimney support, flashing, collar, cap, brace, snow splitter, 1 lot at $820/lot = $820 (You)
- INT-TRIM: Base, casings and sills, 1 lot at $800/lot = $800 (You)

### C. The 12 lines marked "compared with a 2026 source", and the page's source list

| ID | Item | Unit price | Supplier | Probable source |
|---|---|---|---|---|
| FLR-JOIST | Floor joist, I-joist (11 7/8 in at 16 in o.c., TJI 210 or equal (checked on S-301 with the bedroom wall and loft load)) | $3.6/lf | Lumberyard | latestcost.com I-joist prices |
| WAL-ZIPR | Wall sheathing, ZIP System R-6 (1 in foam bonded to 7/16 OSB, taped) | $105/sheet | Lumberyard | latestcost.com ZIP-R panel prices |
| RFG-SEAM | Standing seam panels (24 ga steel, snap-lock, clips) | $5.9/sf | Roofing supplier | resident.com standing seam 2026 |
| RFG-RIB | Ribbed steel panels (26 ga, exposed fasteners) | $3.1/sf | Roofing supplier | resident.com standing seam 2026 (?) |
| OPN-FIX77 | Fixed window, 76 3/4 x 72 in (Low-E, argon, U 0.30 or better) | $1,250/ea | Window dealer | modernize.com window brands |
| OPN-EGR | Casement, 36 x 48 in, egress (Bedrooms) | $520/ea | Window dealer | modernize.com window brands |
| OPN-CAS36 | Casement, 36 x 36 in (North wall by the table) | $420/ea | Window dealer | modernize.com window brands |
| MEC-FURN | Propane wall furnace (Direct vent, about 21,500 BTU, modulating) | $2,049/ea | Propane company | blossmangas.com Rinnai 21,500 BTU |
| MEC-STOVE | Wood stove (EPA certified, small firebox) | $1,900/ea | Hearth dealer | firepitsurplus.com Drolet vs Jøtul |
| MEC-CHIM | Insulated chimney, 6 in (Class A, 48 in lengths) | $420/ea | Hearth dealer | raymurray.com DuraVent 2025 price list |
| MEC-WH | Tankless water heater (Propane, indoor, about 140,000 BTU) | $863/ea | Propane company | blossmangas.com Rinnai RE140 |
| LFT-STAIR | Spiral stair kit (Steel, 4 ft 6 in across, 13 risers) | $3,200/ea | Online | latestcost.com spiral staircase |

Site ranges marked as checked: SITE-SEPTIC and SITE-WELL, from latestcost.com "well and septic Colorado".

The page's full "Prices checked" list (cabin/src/page/app.js):

- Rinnai 21,500 BTU wall furnace: https://www.blossmangas.com/appliances/heaters/rinnai-21500-btu-direct-vent-wall-heater/
- Rinnai RE140 tankless water heater: https://www.blossmangas.com/appliances/gas-water-heaters/rinnai-re140i-ep-tankless-water-heater/
- Drolet and Jøtul stove price ranges: https://www.firepitsurplus.com/blogs/shopping-guides/drolet-vs-jotful
- DuraVent 2025 chimney price list: https://www.raymurray.com/wp-content/uploads/application/pdf/2025-DuraVent-Retail-Price-List-Effective-5-12-25-PDF.pdf
- Propane tank install costs: https://www.thepricer.org/how-much-does-a-500-gal-propane-tank-cost/
- Propane tank output at 0°F: https://elliottelectric.com/StaticPages/ElectricalReferences/Guides/generator-propane-tank-sizing-guide.aspx
- RegO LP-Gas Serviceman’s Manual: tank output by size and temperature: https://www.regoproducts.com/content/dam/pes/pdfs/L-545_Servicemans_Manual.pdf
- Standing seam roof costs, 2026: https://resident.com/home-and-living/2026/04/28/standing-seam-metal-roof-cost-in-2026-what-it-really-costs-and-what-to-expect
- Window price ranges by brand: https://modernize.com/windows/brands
- ZIP-R sheathing panel prices, 2026: https://latestcost.com/zip-r-sheathing-price-per-panel-installed-cost/
- I-joist prices per foot, 2026: https://latestcost.com/tji-floor-joist-cost-installation-prices/
- Spiral stair kit prices: https://latestcost.com/spiral-staircase-cost/
- Off-grid solar system costs, 2026: https://jouleio.com/blog/off-grid-solar-system/
- Framing lumber price index: https://www.gordian.com/resources/lumber-cost-trends
- IECC insulation minimums by climate zone: https://basc.pnnl.gov/information/2009-2021-iecc-and-irc-minimum-insulation-requirements-new-homes
- Colorado county snow loads: https://jacksoncounty.colorado.gov/snow-loads
- Colorado well and septic costs: https://latestcost.com/cost-well-septic-system-colorado/

### D. Hired trades and allowances

| ID | Item | Line | Who | Note |
|---|---|---|---|---|
| FND-STAKE | Layout lumber and string lines (Batter boards, stakes, paint) | $150 | You | Allowance: Temporary layout material |
| FND-AUGER | Auger and mini-excavator rental (2 days with delivery) | $900 | You, rental | Allowance: Digs the 18 pier holes |
| FLR-MISC | Subfloor glue, screws, squash blocks | $380 | You | Allowance: Fasteners and adhesive |
| WAL-TAPE | Sheathing tape and liquid flashing | $380 | You | Allowance: Seams and openings |
| WAL-FASTEN | Nails, screws, framing connectors | $950 | You | Allowance: Fasteners for walls and roof |
| ENV-AIR | Air sealing kit (Foam, gaskets, tapes, caulk, blower-door fix list) | $450 | You | Allowance: Seals the air barrier line on A-501 |
| OPN-HW | Door hardware (Entry lockset, barn door pulls and locks) | $180 | Buy | Allowance: Hardware |
| EXT-TRIM | Trim, corners, flashing, caulk | $1,000 | You | Allowance: Trim package |
| INT-DWFIN | Tape, mud, bead, screws | $380 | You | Allowance: Drywall finishing |
| INT-TRIM | Base, casings and sills | $800 | You | Allowance: Trim package |
| PLB-VALVES | Stops, washer box, test caps | $220 | You | Allowance: Small plumbing parts |
| ELE-ELEC | Electrician (Service hookup, panel, inspection) | $1,900 | Pro | Allowance: Licensed work and sign-off |
| ELE-TEMP | Temporary power for the build (Temp pole or generator rental) | $450 | You, rental | Allowance: Power while building |
| MEC-TANK | Propane tank, 500 gal (ASME, set on a pad and regulated by the propane company) | $3,400 | Pro | Sized for cold snaps: by the RegO D x L x K method a 500 gal tank 30% full gives about 315,000 BTU/h at 0 F and about 157,000 at -10 F (a 250 gal gives 197,000 and 99,000). Price is my estimate. |
| MEC-GASLINE | Buried propane line and riser (Installed by the propane company) | 19 lf at $14/lf = $266 | Pro |  |
| MEC-REG | Second-stage regulator (On the east wall) | $75 | Pro |  |
| MEC-GASFIT | Gas fitter (Connect appliances, pressure test, sign-off) | $650 | Pro | Allowance: Licensed gas work |
| GAR-CONC | Garage footing, stem wall and slab (Footing and 8 in stem wall down to frost (48 in), 4 in slab on gravel sloped to the door, top 9 in above grade so two steps reach the house floor) | 384 sf at $15/sf = $5,760 | Pro | My estimate for a mountain site, formed, poured and finished. |
| GAR-STEP | Landing and steps to the house door (Concrete landing 3 ft deep, about 7 in below the door sill, then two risers of about 7 3/8 in to the slab) | $420 | Pro |  |
| GAR-ODOOR | Overhead door, 10 x 8 ft, with opener (Dark flush steel, not insulated) | $2,400 | Pro | My estimate. |
| GAR-GAS | Propane pipe to the garage heater (Branch off the house furnace line, black iron where it is exposed in the garage, about 10 ft) | 4 lf at $25/lf = $100 | Pro |  |
| GAR-HDW | Garage connectors and fasteners (Anchor bolts, hold-downs, hangers, rafter ties, nails and screws) | $450 | You | Allowance: Allowance for connectors and fasteners |
| GAR-PERMIT | Garage permit and inspections (Added to the house permit; varies by county) | $400 | Pro | Allowance: Garage share of the permit |
| GEN-HELP | Hired help for walls and roof (Two people, four days) | $3,000 | Pro | Allowance: Labor |
| GEN-LIFT | Telehandler and scaffold rental (For the 17 ft wall and the rafters) | $1,400 | You, rental | Allowance: Rental |
| GEN-DUMP | Dumpster and disposal | $650 | You, rental | Allowance: Rental |
| GEN-TOILET | Portable toilet (About 6 months) | $900 | You, rental | Allowance: Rental |
| GEN-SURVEY | Surveyor staking (Corners and setbacks) | $650 | Pro | Allowance: Professional service |
| GEN-ENG | Structural engineer (Snow load, piers, rafters, south wall, stamp) | $2,200 | Pro | Allowance: Professional service |
| GEN-PERMIT | Building permit and plan review (Varies a lot by county) | $2,400 | Pro | Allowance: Fees |
| GEN-INS | Builder's risk insurance | $700 | Pro | Allowance: Insurance |
| GEN-DELIV | Delivery charges (One charge per drop, see the delivery list) | 9 drop at $175/drop = $1,575 | Buy | Allowance: Freight to a mountain site (my estimate) |

### E. Site costs not in the total

| ID | Item | Page range | Basis | Note |
|---|---|---|---|---|
| SITE-SEPTIC | Septic system | $6,000 to $25,000 | checked | Conventional system in Colorado. Mountain sites often cost more. Needs a soil test first. |
| SITE-WELL | Water well and pump | $8,000 to $32,000 | checked | Drilling and casing. A deep mountain well can cost much more. |
| SITE-CISTERN | Hauled-water tank instead of a well | $3,000 to $6,000 | estimate | My estimate: 1,500 gal buried tank, pump and fill line. You haul water in. |
| SITE-SEWER | Sewer line to the septic tank | Get a quote | estimate | Part of the septic quote. 4 in pipe below frost. |
| SITE-WATER | Water line from the well | Get a quote | estimate | Part of the well quote. Below frost, under the north snow pile. |
| SITE-POWER | Power line from the road | Get a quote | estimate | Get a quote from the utility. A long line extension can cost more than the cabin's electrical work. Not needed off-grid. |
| SITE-DRIVE | Driveway and parking | Get a quote | estimate | Depends on slope and distance. Get a quote from a local excavator. |

### F. What each choice does to the total (from the default $230,813)

- Foundation: Insulated crawlspace: +$5,771
- Roof snow load: 60 psf: −$5,148
- Roof snow load: 150 psf: +$16,060
- Heat: Propane only: −$5,965
- Heat: Wood stove only: −$3,265
- Power: Off-grid solar: +$24,259
- South glass: Lean, 2 bays: −$3,259
- Roof metal: Ribbed panels: −$7,685
- Remove Attached garage: −$55,063
- Remove Covered area, north: −$8,902
- Remove Covered entry, west: −$17,398
- Add Gear loft + spiral stair: +$7,002
- Remove Washer-dryer: −$1,597
- Remove Paid framing help: −$3,300

"Ways to spend less" lines that are not in the model, with the page's own savings estimates (before tax and contingency): Plain ZIP sheathing and an energy trade-off calc instead of ZIP-R $3,000; Single vented roof deck instead of the double cold roof $1,500; Painted drywall instead of pine ceiling $900; Sanded and sealed subfloor instead of vinyl plank $1,900; Fewer built-ins: open shelves only $900.

### G. Build facts the quantities depend on

- House 32 x 24 ft, one story. Floor 2.58 ft above grade on piers. North-side ceiling 9 ft; the south glass wall is about 17 ft. Shed roof at 4:12, overhangs 3 ft south, 1.5 ft north, 1.5 ft rakes. Double cold roof: 16 in I-joist rafters at 12 in o.c. for 100 psf, lower 5/8 in OSB deck, 2x4 vent sleepers, upper 23/32 in deck, metal.
- Attached garage 24 x 16 ft (384 sf slab) on a stem wall to 48 in frost depth, same rafter and roof build-up as the house, covered entry on 8x8 posts about 18 ft tall, covered area on the north on four 6x6 posts.
- Walls 2x6 at 16 in o.c. with LSL studs above 12 ft, ZIP System R-6 sheathing, R-23 mineral wool, fiber-cement board and batten on a rainscreen. Floor R-44 dense-pack cellulose, roof R-60 dense-pack cellulose.
- Schedule: 90 working days, 2027-05-17 to 2027-09-20, two people full time, 9 deliveries. Hired: site work, well and septic, garage concrete, 4 days of framing help, chimney and propane, electrician sign-off, overhead door, surveyor, engineer.
- Model parts: 2,476 parts map to 175 lines; quantities are computed from the 3D model (length, area, count, volume) with per-line waste factors in model.json `catalog.items[].q`.
