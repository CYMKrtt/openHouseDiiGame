// Artwork copied from the approved reference.
export function LobbyArt0() { return (<svg viewBox="0 0 28 28" shapeRendering="crispEdges"><path fill="#303632" d="M8 4h12v4h4v13H4V8h4z" /><path fill="#FDF7DF" d="M10 7h8v4H10zM7 12h6v6H7zM16 12h5v6h-5z" /><path fill="#E67B60" d="M12 18h4v6h-4z" /></svg>); }
export function LobbyArt1() { return (<svg className="scene" viewBox="0 0 760 490" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
<g className="room" strokeLinejoin="miter">
{ /* soft shadow */ }
<path d="M106 343 L365 458 L674 337 L412 220Z" fill="#D6CEB6" opacity=".48" />
{ /* isometric floor and exposed thickness */ }
<path d="M90 284L366 410L688 272L407 156Z" fill="#EACDA2" stroke="#8E7760" strokeWidth={5} />
<path d="M90 284L366 410V434L90 306Z" fill="#B58B68" stroke="#8E7760" strokeWidth={5} />
<path d="M366 410L688 272V293L366 434Z" fill="#C49B75" stroke="#8E7760" strokeWidth={5} />
<path d="M124 277L367 387L651 267L405 169Z" fill="#F4DEB6" stroke="#D1B48B" strokeWidth={3} />
{ /* floor boards */ }
<path d="M178 298l276-113M232 324l276-116M289 349l271-115M347 373l259-115M148 283l260 116M202 262l261 114M259 239l259 114M314 218l260 110" stroke="#DEC39C" strokeWidth={3} opacity=".62" />
{ /* walls */ }
<path d="M90 284V148L405 22V156Z" fill="#E8DABD" stroke="#8E7760" strokeWidth={5} />
<path d="M405 22L688 145V272L405 156Z" fill="#F6E9D3" stroke="#8E7760" strokeWidth={5} />
{ /* baseboards */ }
<path d="M90 266L405 141L688 258V271L405 156L90 284Z" fill="#C0B19A" opacity=".8" />
{ /* left wall window pixel */ }
<path d="M155 141L293 84V194L155 249Z" fill="#9EAFA9" stroke="#9F8264" strokeWidth={8} />
<path d="M166 147L282 100V186L166 233Z" fill="#CBE9E6" />
<path d="M166 194L282 147M225 123V209" stroke="#F9F5E7" strokeWidth={8} />
<path d="M181 151L207 141V177L181 188Z" fill="#A6CFC2" />
<path d="M237 130L267 117V142L237 154Z" fill="#94BCB4" />
{ /* wall board */ }
<path d="M446 66L624 140V218L446 145Z" fill="#C0A98B" stroke="#9C836B" strokeWidth={6} />
<path d="M456 79L612 145V202L456 135Z" fill="#F8F0D9" />
<path d="M473 92l36 15v28l-36-15z" fill="#C6D6CB" /><path d="M518 111l35 15v32l-35-15z" fill="#F2C3A9" /><path d="M563 132l34 14v28l-34-14z" fill="#E5CF8F" />
<path d="M479 111l24 10M524 134l20 8M569 152l19 8" stroke="#8F968C" strokeWidth={3} />
{ /* wall clock */ }
<path d="M344 95l24-10 23 10v26l-23 10-24-10z" fill="#E1B87C" stroke="#8E7760" strokeWidth={4} />
<path d="M366 96v14l9 5" fill="none" stroke="#786854" strokeWidth={4} />
{ /* hanging lamp */ }
<path d="M380 39v35" stroke="#867C69" strokeWidth={5} />
<path d="M346 76l35-16 35 16-35 15Z" fill="#E7AC64" stroke="#927256" strokeWidth={4} />
<path d="M354 82l27 11 28-11" fill="#FFE2A4" />
{ /* shelf at back left */ }
<path d="M116 230l82-34 31 14-82 34Z" fill="#B98B66" stroke="#8B7159" strokeWidth={4} />
<path d="M147 244v55l-17-8v-54zM209 216v50l-14 8v-48z" fill="#B79271" />
<path d="M133 213l12-5v22l-12 5z" fill="#739C8A" /><path d="M150 207l12-5v21l-12 5z" fill="#E0AB75" /><path d="M167 200l12-5v20l-12 5z" fill="#9BA8C6" />
{ /* plant back right */ }
<path d="M630 245l27-10 19 8-27 11Z" fill="#B88169" /><path d="M630 245l19 9v37l-19-8z" fill="#9D6857" /><path d="M649 254l27-11v37l-27 11z" fill="#BD8C72" />
<g className="plant-leaf"><path d="M646 249v-61" stroke="#547B61" strokeWidth={6} /><path d="M646 218l-24-18v-15l28 20zM650 211l23-25 13 7-35 31zM643 204l-15-26 11-10 16 33zM647 241l30-22 8 13-35 19z" fill="#74A78B" stroke="#527C64" strokeWidth={3} /></g>
{ /* big rear desk */ }
<path d="M405 235l98-39 107 44-103 42Z" fill="#C7956B" stroke="#846B55" strokeWidth={5} />
<path d="M405 235v48l102 46v-47Z" fill="#B17F60" stroke="#846B55" strokeWidth={5} />
<path d="M507 282v47l103-44v-45Z" fill="#D5A67A" stroke="#846B55" strokeWidth={5} />
<path d="M419 231l83-33 90 39-87 36Z" fill="#F1CD95" />
{ /* desk monitor 1 */ }
<path d="M435 196l45-17 35 15-44 18z" fill="#394D55" stroke="#384650" strokeWidth={4} />
<path d="M435 196v-39l45-18v40z" fill="#3A4F58" stroke="#29363D" strokeWidth={4} />
<path className="monitor-glow" d="M443 159l29-12v27l-29 12z" fill="#91CDBD" />
<path d="M449 160l16-7M449 169l11-4M449 177l14-6" stroke="#4A827F" strokeWidth={3} />
<path d="M472 195v18" stroke="#475A5B" strokeWidth={6} />
{ /* desk monitor 2 */ }
<path d="M534 201l44 17v37l-44-19z" fill="#405C5E" stroke="#2F464A" strokeWidth={4} />
<path className="monitor-glow" d="M541 210l29 11v24l-29-11z" fill="#9AC4CB" />
<path d="M547 220l17 6M547 227l12 5" stroke="#557F91" strokeWidth={3} />
<path d="M554 243v15" stroke="#4C5D5C" strokeWidth={6} />
{ /* keyboard */ }
<path d="M484 245l39-15 28 11-39 16z" fill="#EEEDE5" stroke="#8E8879" strokeWidth={3} />
<path d="M494 244l30-11" stroke="#AAA79B" strokeWidth={2} strokeDasharray="5 3" />
{ /* front small desk */ }
<path d="M197 315l103-42 99 43-105 45Z" fill="#F0C690" stroke="#8E735B" strokeWidth={5} />
<path d="M197 315v39l97 45v-38z" fill="#A98265" stroke="#8E735B" strokeWidth={4} />
<path d="M294 361v38l105-43v-40z" fill="#C59872" stroke="#8E735B" strokeWidth={4} />
{ /* laptop */ }
<path d="M264 313l50 21 39-16-52-21Z" fill="#6D898C" stroke="#3D5256" strokeWidth={4} />
<path d="M286 309v-48l50 20v48z" fill="#47656E" stroke="#31484F" strokeWidth={4} />
<path className="monitor-glow" d="M294 274l34 14v30l-34-14Z" fill="#B0D9CF" />
<path d="M299 285l23 9M299 294l17 7" stroke="#5C9A92" strokeWidth={3} />
{ /* mugs/stationery */ }
<path d="M348 285l17-7 10 5-17 7zM348 285v13l10 5v-13zM358 290l17-7v13l-17 7z" fill="#E6957C" />
<path d="M368 294l10-5v-7l-10 5" fill="none" stroke="#B97968" strokeWidth={3} />
<path d="M380 282l12-5v21l-12 5z" fill="#87AA8C" />
{ /* Person at back desk */ }
<path d="M478 228l22-10 25 10-23 11Z" fill="#A15F52" /><path d="M477 229v30l24 12v-32z" fill="#8D6255" /><path d="M501 239l24-11v31l-24 12z" fill="#BC7860" />
<path d="M483 207l24-9 21 11-23 10Z" fill="#3F4C49" /><path d="M483 206v23l22 10v-22z" fill="#F1C4A0" /><path d="M505 218l23-10v23l-23 9Z" fill="#DBA681" />
<path d="M485 195l23-10 18 11-20 9-21 3z" fill="#493D39" /><path d="M485 195v12l20 10v-13z" fill="#493D39" />
<path d="M492 218l23-8 17 9-25 11z" fill="#779DA6" />
<path d="M492 218v33l16 8v-29z" fill="#638795" /><path d="M508 230l24-11v29l-24 11z" fill="#83AFB4" />
<path className="person-arm" d="M511 233l27 12 12-5 7 6-19 10-29-13z" fill="#E6B390" />
{ /* front person */ }
<path d="M238 338l23-9 31 14-22 10Z" fill="#6D947C" /><path d="M238 338v31l31 14v-30z" fill="#567B6E" /><path d="M269 353l23-10v29l-23 11Z" fill="#8AAF8F" />
<path d="M233 315l25-11 25 10-27 12z" fill="#DBAE8F" /><path d="M233 315v23l23 13v-25z" fill="#E4B391" /><path d="M256 326l27-12v22l-27 15z" fill="#D09B79" />
<path d="M230 310l25-12 25 10-24 12z" fill="#665143" /><path d="M229 310v10l27 11v-11z" fill="#665143" />
<path className="person-arm" d="M276 353l27 9 17-10 8 7-22 14-29-9z" fill="#E2AD88" />
{ /* stool */ }
<path d="M420 337l38-14 29 14-39 15z" fill="#779B96" stroke="#6F7B70" strokeWidth={4} />
<path d="M430 349v38l18 7v-42zM469 347v34l-16 7v-37z" fill="#6B8985" />
{ /* floor planter */ }
<path d="M118 314l27-11 28 12-26 12z" fill="#CB9C75" /><path d="M118 314v28l29 13v-28z" fill="#B88467" /><path d="M147 327l26-12v28l-26 12z" fill="#D5A47D" />
<g className="plant-leaf"><path d="M145 310v-40" stroke="#5F8665" strokeWidth={5} /><path d="M143 287l-25-19 3-12 27 22zM148 285l25-25 12 6-33 30zM142 275l-14-26 12-7 14 27z" fill="#79A68B" stroke="#507C67" strokeWidth={3} /></g>
{ /* books on floor */ }
<path d="M556 325l42-17 25 10-42 18z" fill="#E1A177" /><path d="M556 325v11l25 12v-12z" fill="#B97A65" /><path d="M581 336l42-18v12l-42 18z" fill="#C88E70" />
<path d="M572 315l36-15 22 10-38 15z" fill="#86A9B4" />
{ /* little rug */ }
<path d="M376 357l67-28 44 21-68 28z" fill="#C4C6A5" opacity=".6" />
</g>
{ /* floating pixel sparkles */ }
<g className="sparkle" fill="#EEB646"><path d="M110 102h6v10h10v6h-10v10h-6v-10h-10v-6h10z" /></g>
<g className="sparkle" fill="#E67B60"><path d="M660 94h5v8h8v5h-8v8h-5v-8h-8v-5h8z" /></g>
<g className="sparkle" fill="#82B7A2"><path d="M700 355h5v7h7v5h-7v7h-5v-7h-7v-5h7z" /></g>
<g className="sparkle" fill="#E9B66C"><path d="M154 382h5v7h7v5h-7v7h-5v-7h-7v-5h7z" /></g>
</svg>); }
