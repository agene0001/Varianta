import type { Opening } from "../types/chess";
import type { TreeMove } from "../types/chess";
import { linesFromTree } from "./treeUtils";

/** Helper to build a linear chain of moves (single variation, no branches). */
function line(...moves: Array<{ san: string; description?: string }>): TreeMove[] {
  if (moves.length === 0) return [];
  const [first, ...rest] = moves;
  return [{
    san: first.san,
    description: first.description,
    variations: rest.length > 0 ? line(...rest) : undefined,
  }];
}

// ─── Italian Game ─────────────────────────────────────────────
const italianTrunk: TreeMove[] = [
  {
    san: "e4",
    description: "Start by opening with the king's pawn to e4, claiming the center.",
    variations: [
      {
        san: "e5",
        description: "Black responds symmetrically.",
        variations: [
          {
            san: "Nf3",
            description: "Black responded symmetrically with e5. Develop your knight to f3 to attack their pawn.",
            variations: [
              {
                san: "Nc6",
                description: "Black defends the e5 pawn with their knight.",
                variations: [
                  {
                    san: "Bc4",
                    description: "Black defended with Nc6. Bring out the Italian Bishop to c4, targeting the weak f7 square.",
                    variations: [
                      {
                        san: "Bc5",
                        description: "Black mirrors your bishop development.",
                        lineName: "Main Line",
                        lineDescription: "The most common continuation with Bc5",
                        variations: [
                          ...line(
                            { san: "c3", description: "Black played Bc5. Play c3 to prepare the d4 pawn push and build a strong pawn center." },
                            { san: "d6", description: "Black solidifies their center with d6." },
                            { san: "d4", description: "Black played d6. Strike in the center with d4 as planned." },
                            { san: "exd4", description: "Black captures on d4." },
                            { san: "cxd4", description: "Black opened the position by capturing. Recapture with cxd4 to gain a strong pawn center." },
                            { san: "Bb6", description: "Black retreats the bishop to b6." },
                          ),
                          {
                            san: "b4",
                            description: "Black played Bc5. Play the daring Evans Gambit, sacrificing a pawn to deflect the bishop and seize a powerful center.",
                            lineName: "Evans Gambit",
                            lineDescription: "Sharp gambit deflecting the bishop with b4",
                            variations: line(
                              { san: "Bxb4", description: "Black accepts the gambit by capturing your pawn." },
                              { san: "c3", description: "Black took the pawn. Hit the bishop with c3 and prepare a monster center with d4." },
                              { san: "Ba5", description: "Black retreats to a5, keeping pressure on c3." },
                              { san: "d4", description: "Black retreated. Build your big center with d4!" },
                              { san: "exd4", description: "Black captures on d4." },
                              { san: "O-O", description: "Black grabbed material. Skip the recapture and castle (O-O), prioritizing rapid development." },
                            ),
                          },
                          {
                            san: "d3",
                            description: "Black played Bc5. Play the quiet Giuoco Pianissimo with d3 — a slow, patient setup aiming for a long strategic battle.",
                            lineName: "Giuoco Pianissimo",
                            lineDescription: "Slow, restrained Italian setup with d3",
                            variations: line(
                              { san: "Nf6", description: "Black develops their knight to f6." },
                              { san: "c3", description: "Black developed to f6. Prepare a later d4 with the supporting move c3." },
                              { san: "d6", description: "Black plays solidly with d6." },
                              { san: "O-O", description: "Black solidified. Castle (O-O) for king safety before any central break." },
                              { san: "O-O", description: "Black castles. Both sides are safe — the position is quiet and balanced." },
                            ),
                          },
                        ],
                      },
                      {
                        san: "Be7",
                        description: "Black plays the Hungarian Defense with Be7.",
                        lineName: "Hungarian Defense",
                        lineDescription: "Black plays Be7 instead of Bc5",
                        variations: line(
                          { san: "d3", description: "Black chose the solid Hungarian Defense (Be7). Play cautiously with d3 to reinforce the center." },
                          { san: "f5", description: "Black counter-attacks in the center with f5." },
                          { san: "Ng5", description: "Black aggressively pushed f5! Jump your knight to g5, eyeing f7 and the weak e6 square." },
                          { san: "f4", description: "Black pushes f4 to gain space." },
                          { san: "Nf7", description: "Black ignored the threat. Play Nf7 to fork the queen and rook!" },
                          { san: "Bxf7+", description: "Black plays a tactical shot." },
                        ),
                      },
                      {
                        san: "f5",
                        description: "Black plays an aggressive counter-strike with f5!",
                        lineName: "Paris Defense",
                        lineDescription: "Black develops the knight to e7",
                        variations: line(
                          { san: "d3", description: "Black attacks your center with f5. Play solidly with d3." },
                          { san: "Nge7", description: "Black flexibly develops their knight to e7." },
                          { san: "exf5", description: "Black played Ne7. Capture the f5 pawn with exf5." },
                          { san: "d5", description: "Black advances in the center with d5." },
                          { san: "Bb3", description: "Black pushed d5. Retreat your bishop to b3." },
                          { san: "Nxf5", description: "Black recaptures the pawn with the knight." },
                        ),
                      },
                      {
                        san: "Nf6",
                        description: "Black plays the Two Knights Defense, immediately counter-attacking your e4 pawn.",
                        lineName: "Two Knights Defense",
                        lineDescription: "Black attacks e4 with Nf6",
                        variations: line(
                          { san: "Ng5", description: "Black attacked e4 with Nf6. Play the aggressive Ng5, eyeing the weak f7 square." },
                          { san: "d5", description: "Black breaks the attack on f7 by counter-striking with d5." },
                          { san: "exd5", description: "Black pushed d5. Capture the pawn with exd5." },
                          { san: "Na5", description: "Black sidesteps with Na5, attacking your bishop." },
                          { san: "Bb5+", description: "Black attacked your bishop. Retreat with check (Bb5+) to keep the initiative." },
                          { san: "c6", description: "Black blocks the check with c6." },
                          { san: "dxc6", description: "Black blocked with c6. Capture the pawn (dxc6) to open lines against the king." },
                        ),
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
];

// ─── Queen's Gambit ───────────────────────────────────────────
const queensGambitTree: TreeMove[] = [
  {
    san: "d4",
    description: "Open with the queen's pawn to d4.",
    variations: [
      {
        san: "d5",
        description: "Black matches your central pawn with d5.",
        variations: [
          {
            san: "c4",
            description: "Black matched with d5. Offer the Queen's Gambit by playing c4 to challenge their center.",
            variations: [
              {
                san: "dxc4",
                description: "Black accepts the gambit by taking the pawn!",
                lineName: "Accepted",
                lineDescription: "Black takes the gambit pawn",
                variations: line(
                  { san: "Nf3", description: "Black took the c4 pawn. Develop naturally with Nf3; there is no rush to win the pawn back." },
                  { san: "Nf6", description: "Black develops their knight to f6." },
                  { san: "e3", description: "Black played Nf6. Play e3 to open your light-squared bishop and prepare to recapture on c4." },
                  { san: "e6", description: "Black supports the center with e6." },
                  { san: "Bxc4", description: "Black solidified with e6. Recapture the pawn with Bxc4, placing the bishop on a great diagonal." },
                  { san: "c5", description: "Black strikes at your d4 pawn with c5." },
                  { san: "O-O", description: "Black is challenging your center. Prioritize king safety and castle kingside (O-O)." },
                  { san: "a6", description: "Black prepares b5 to challenge your bishop." },
                ),
              },
              {
                san: "e6",
                description: "Black declines the gambit with e6.",
                lineName: "Declined - Orthodox",
                lineDescription: "Black declines with e6, developing naturally",
                variations: line(
                  { san: "Nc3", description: "Black kept a solid structure with e6. Develop your knight to c3 to add pressure to d5." },
                  { san: "Nf6", description: "Black develops and defends d5 with Nf6." },
                  { san: "Bg5", description: "Black reinforced d5. Play Bg5 to pin the knight against the queen!" },
                  { san: "Be7", description: "Black breaks the pin by developing their bishop to e7." },
                  { san: "e3", description: "Black unpinned their knight. Solidify your center by playing e3." },
                  { san: "O-O", description: "Black castles to safety." },
                  { san: "Nf3", description: "Black castled. Complete your kingside development with Nf3." },
                  { san: "Nbd7", description: "Black develops their other knight to d7." },
                ),
              },
              {
                san: "c6",
                description: "Black plays the Slav Defense, supporting d5 with c6.",
                lineName: "Declined - Slav Defense",
                lineDescription: "Black supports d5 with c6",
                variations: line(
                  { san: "Nf3", description: "Black played the Slav. Develop your knight to f3." },
                  { san: "Nf6", description: "Black develops naturally to f6." },
                  { san: "Nc3", description: "Black played Nf6. Bring out your other knight to c3 to increase central pressure." },
                  { san: "dxc4", description: "Black captures on c4 (Slav Accepted!)." },
                  { san: "a4", description: "Black finally took on c4! Play a4 to prevent them from playing b5 to protect the pawn." },
                  { san: "Bf5", description: "Black develops their bishop to f5." },
                  { san: "e3", description: "Black got their bishop outside the pawn chain. Play e3 to prepare to recapture on c4." },
                  { san: "e6", description: "Black plays e6 to prepare development." },
                ),
              },
              {
                san: "e5",
                description: "Black plays the bold Albin Counter-Gambit, sacrificing a pawn for active piece play and a dangerous d4 outpost.",
                lineName: "Albin Counter-Gambit",
                lineDescription: "Sharp counter-gambit with 2...e5",
                variations: line(
                  { san: "dxe5", description: "Black sacrificed a pawn. Accept by capturing on e5." },
                  { san: "d4", description: "Black pushes d4, the key idea — the pawn cramps your queenside and supports tactics on the dark squares." },
                  { san: "Nf3", description: "Black wedged a pawn on d4. Develop with Nf3, blockading the pawn and preparing g3." },
                  { san: "Nc6", description: "Black develops with Nc6, attacking the e5 pawn." },
                  { san: "g3", description: "Black attacked your pawn. Prepare a long-diagonal fianchetto with g3 to pressure d5 from g2." },
                  { san: "Bg4", description: "Black pins your knight with Bg4." },
                  { san: "Bg2", description: "Black pinned the knight. Complete your fianchetto with Bg2." },
                ),
              },
              {
                san: "Nc6",
                description: "Black plays the Chigorin Defense, developing pieces aggressively at the cost of slightly weakening d5.",
                lineName: "Chigorin Defense",
                lineDescription: "Active piece play with 2...Nc6",
                variations: line(
                  { san: "Nc3", description: "Black developed actively. Match it by developing your knight to c3, hitting the d5 pawn." },
                  { san: "dxc4", description: "Black grabs the c4 pawn." },
                  { san: "Nf3", description: "Black took the pawn. Develop naturally with Nf3 — there's no rush to recapture." },
                  { san: "Nf6", description: "Black develops to f6." },
                  { san: "e4", description: "Black played Nf6. Seize the center with e4 since Black gave up the d5 pawn." },
                  { san: "Bg4", description: "Black pins your knight with Bg4." },
                  { san: "Bxc4", description: "Black pinned the knight. Recapture the gambit pawn with Bxc4." },
                ),
              },
              {
                san: "Nf6",
                description: "Black plays the Marshall Defense, developing the knight before resolving the central tension.",
                lineName: "Marshall Defense",
                lineDescription: "Black develops with 2...Nf6",
                variations: line(
                  { san: "cxd5", description: "Black developed before resolving the center. Punish it by capturing on d5 (cxd5)." },
                  { san: "Nxd5", description: "Black recaptures with the knight." },
                  { san: "Nf3", description: "Black centralized the knight. Develop your own knight to f3." },
                  { san: "Bf5", description: "Black develops the light-squared bishop actively to f5." },
                  { san: "Qb3", description: "Black developed the bishop. Hit b7 and pressure d5 with Qb3, a strong queen move." },
                  { san: "e6", description: "Black defends b7 with e6." },
                  { san: "Nc3", description: "Black defended with e6. Add another attacker to d5 with Nc3." },
                ),
              },
            ],
          },
        ],
      },
    ],
  },
];

// ─── Ruy López ───────────────────────────────────────────────
const ruyLopezTree: TreeMove[] = [
  {
    san: "e4",
    description: "Open with e4.",
    variations: [
      {
        san: "e5",
        description: "Black responds with e5.",
        variations: [
          {
            san: "Nf3",
            description: "Black played e5. Develop the knight to f3 to attack the pawn.",
            variations: [
              {
                san: "Nc6",
                description: "Black defends with Nc6.",
                variations: [
                  {
                    san: "Bb5",
                    description: "Black defended e5. Play Bb5, the Ruy López, pinning the knight that defends the pawn.",
                    variations: [
                      {
                        san: "Nf6",
                        description: "Black plays the Berlin Defense, counter-attacking e4.",
                        lineName: "Berlin Defense",
                        lineDescription: "The solid Berlin Defense",
                        variations: line(
                          { san: "O-O", description: "Black attacked your e4 pawn with Nf6. Ignore the threat and castle (O-O) to safety." },
                          { san: "Nxe4", description: "Black grabs the e4 pawn!" },
                          { san: "d4", description: "Black took the pawn! Strike back in the center with d4 to open the e-file." },
                          { san: "Nd6", description: "Black retreats the knight to d6, attacking your bishop." },
                          { san: "Bxc6", description: "Black attacked your bishop. Capture their knight with Bxc6." },
                          { san: "dxc6", description: "Black recaptures with their d-pawn." },
                        ),
                      },
                      {
                        san: "a6",
                        description: "Black plays the Morphy Defense (a6), asking your bishop a question.",
                        variations: [
                          {
                            san: "Ba4",
                            description: "Black attacked your bishop with a6. Retreat to a4 to maintain the pin on the diagonal.",
                            variations: [
                              {
                                san: "Nf6",
                                description: "Black develops to f6 and attacks e4.",
                                variations: [
                                  {
                                    san: "O-O",
                                    description: "Black attacked e4. Castle (O-O) to secure your king.",
                                    variations: [
                                      {
                                        san: "Be7",
                                        description: "Black develops their bishop to e7.",
                                        variations: [
                                          {
                                            san: "Re1",
                                            description: "Black prepared to castle. Reinforce your e4 pawn with the rook (Re1).",
                                            variations: [
                                              {
                                                san: "b5",
                                                description: "Black pushes b5 to gain space and attack the bishop.",
                                                variations: [
                                                  {
                                                    san: "Bb3",
                                                    description: "Black pushed b5. Retreat the bishop to b3, where it still eyes the f7 square.",
                                                    lineName: "Closed Defense",
                                                    lineDescription: "The main line with a6 and b5",
                                                    variations: line(
                                                      { san: "d6", description: "Black plays a solid d6." },
                                                    ),
                                                  },
                                                ],
                                              },
                                            ],
                                          },
                                        ],
                                      },
                                    ],
                                  },
                                ],
                              },
                            ],
                          },
                          {
                            san: "Bxc6",
                            description: "Black played a6 (Morphy Defense). Play the Exchange Variation by immediately capturing the knight (Bxc6).",
                            lineName: "Exchange Variation",
                            lineDescription: "White exchanges immediately on c6",
                            variations: line(
                              { san: "dxc6", description: "Black recaptures with the d-pawn." },
                              { san: "O-O", description: "Black recaptured on c6. Castle (O-O) to complete your initial development." },
                              { san: "f6", description: "Black plays f6 to solidify e5." },
                              { san: "d4", description: "Black defended e5 with f6. Challenge the center immediately with d4." },
                              { san: "exd4", description: "Black captures on d4." },
                              { san: "Nxd4", description: "Black opened the center. Recapture with the knight (Nxd4) to centralize and keep equal material." },
                            ),
                          },
                        ],
                      },
                      {
                        san: "f5",
                        description: "Black plays the sharp Schliemann (Jaenisch) Defense, immediately throwing the f-pawn forward to fight for the initiative.",
                        lineName: "Schliemann Defense",
                        lineDescription: "Aggressive gambit with 3...f5",
                        variations: line(
                          { san: "Nc3", description: "Black launched f5. Defend prophylactically with Nc3, overprotecting e4." },
                          { san: "fxe4", description: "Black takes on e4." },
                          { san: "Nxe4", description: "Black grabbed the pawn. Recapture with the knight to centralize and pressure e5." },
                          { san: "d5", description: "Black hits your knight with d5." },
                          { san: "Nxe5", description: "Black attacked your knight. Take the e5 pawn with Nxe5, double-attacking c6." },
                          { san: "dxe4", description: "Black retakes the knight." },
                          { san: "Nxc6", description: "Black grabbed your knight. Recapture with Nxc6 to win Black's knight in return." },
                        ),
                      },
                      {
                        san: "d6",
                        description: "Black plays the Steinitz Defense, solidly defending e5 with d6.",
                        lineName: "Steinitz Defense",
                        lineDescription: "Solid setup with 3...d6",
                        variations: line(
                          { san: "d4", description: "Black played the Steinitz. Strike the center immediately with d4 — Black's setup is passive." },
                          { san: "Bd7", description: "Black supports the knight with Bd7." },
                          { san: "Nc3", description: "Black defended laterally. Develop your knight to c3 to add a defender to e4." },
                          { san: "Nf6", description: "Black develops to f6." },
                          { san: "O-O", description: "Black developed naturally. Castle (O-O) to safety before committing to a plan." },
                          { san: "Be7", description: "Black develops the bishop to e7." },
                          { san: "Re1", description: "Black prepared to castle. Reinforce e4 with the rook (Re1)." },
                        ),
                      },
                      {
                        san: "Nge7",
                        description: "Black plays the Cozio Defense, keeping the option of f6 supporting e5.",
                        lineName: "Cozio Defense",
                        lineDescription: "Quiet defense with 3...Nge7",
                        variations: line(
                          { san: "Nc3", description: "Black played the Cozio. Develop naturally with Nc3 — the cramped Black knight on e7 gives you a free hand." },
                          { san: "g6", description: "Black prepares a kingside fianchetto with g6." },
                          { san: "d4", description: "Black committed to fianchetto. Strike in the center with d4 to challenge their setup before they finish development." },
                          { san: "exd4", description: "Black captures on d4." },
                          { san: "Nxd4", description: "Black opened the center. Recapture with the knight to centralize." },
                          { san: "Bg7", description: "Black completes the fianchetto with Bg7." },
                          { san: "Be3", description: "Black fianchettoed. Develop with Be3, eyeing the dark squares and preparing to castle queenside." },
                        ),
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
];

// ─── Sicilian Defense ────────────────────────────────────────
const sicilianTree: TreeMove[] = [
  {
    san: "e4",
    description: "White opens with e4.",
    variations: [
      {
        san: "c5",
        description: "White opened with e4. Play the Sicilian Defense with c5 to fight for the d4 square asymmetrically.",
        variations: [
          {
            san: "Nf3",
            description: "White develops their knight to f3.",
            variations: [
              {
                san: "d6",
                description: "White played Nf3. Play d6 to prepare your center and prevent e5.",
                variations: [
                  {
                    san: "d4",
                    description: "White pushes for central control with d4.",
                    variations: [
                      {
                        san: "cxd4",
                        description: "White played d4. Exchange your c-pawn (cxd4) to open the c-file for your rook.",
                        variations: [
                          {
                            san: "Nxd4",
                            description: "White recaptures with the knight.",
                            variations: [
                              {
                                san: "Nf6",
                                description: "White recaptured on d4. Develop your knight to f6 to attack the undefended e4 pawn.",
                                variations: [
                                  {
                                    san: "Nc3",
                                    description: "White defends e4 with their knight.",
                                    variations: [
                                      {
                                        san: "a6",
                                        description: "White defended e4 with Nc3. Play the flexible Najdorf move (a6) to prevent pieces from landing on b5.",
                                        lineName: "Najdorf Variation",
                                        lineDescription: "The sharp and complex Najdorf system",
                                        variations: line(
                                          { san: "Be3", description: "White develops the bishop to e3." },
                                          { san: "e5", description: "White played Be3. Gain space and kick the knight by playing e5!" },
                                        ),
                                      },
                                      {
                                        san: "g6",
                                        description: "White played Nc3. Play g6 to prepare the Dragon fianchetto setup.",
                                        lineName: "Dragon Variation",
                                        lineDescription: "Black fianchettoes the bishop to g7",
                                        variations: line(
                                          { san: "Be3", description: "White develops their bishop to e3." },
                                          { san: "Bg7", description: "White played Be3. Complete the fianchetto (Bg7) to point the 'Dragon Bishop' at the center!" },
                                        ),
                                      },
                                    ],
                                  },
                                ],
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              {
                san: "g6",
                description: "White played Nf3. Play the Accelerated Dragon by playing g6 immediately, skipping d6.",
                lineName: "Accelerated Dragon",
                lineDescription: "Dragon setup without d6",
                variations: line(
                  { san: "d4", description: "White opens the center with d4." },
                  { san: "cxd4", description: "White played d4. Exchange pawns with cxd4." },
                  { san: "Nxd4", description: "White recaptures with the knight." },
                  { san: "Bg7", description: "White recaptured. Complete your fianchetto with Bg7 to pressure the knight." },
                  { san: "c4", description: "White clamps down on d5 with c4 (the Maróczy Bind)." },
                  { san: "Nc6", description: "White established the Maróczy Bind. Develop your knight to c6 to pressure d4." },
                  { san: "Be3", description: "White solidifies with Be3." },
                  { san: "Nf6", description: "White played Be3. Develop your other knight to f6, attacking e4." },
                ),
              },
              {
                san: "e6",
                description: "White played Nf3. Enter the Scheveningen by playing e6, building a small but flexible pawn center.",
                lineName: "Scheveningen Variation",
                lineDescription: "Small-center Sicilian with e6 and d6",
                variations: line(
                  { san: "d4", description: "White pushes for central control with d4." },
                  { san: "cxd4", description: "White played d4. Exchange pawns to open the c-file for your rook." },
                  { san: "Nxd4", description: "White recaptures with the knight." },
                  { san: "Nf6", description: "White recaptured. Develop your knight to f6 to attack the undefended e4 pawn." },
                  { san: "Nc3", description: "White defends e4 with Nc3." },
                  { san: "d6", description: "White defended e4. Complete the Scheveningen with d6, the small-center hallmark." },
                  { san: "Be2", description: "White develops modestly with Be2, preparing kingside castling." },
                  { san: "Be7", description: "White is preparing to castle. Mirror with Be7 and head for the same plan." },
                ),
              },
              {
                san: "Nc6",
                description: "White played Nf3. Develop your knight to c6, preparing the sharp Sveshnikov complex.",
                lineName: "Sveshnikov Variation",
                lineDescription: "The dynamic Sveshnikov / Lasker-Pelikan",
                variations: line(
                  { san: "d4", description: "White opens the center with d4." },
                  { san: "cxd4", description: "White played d4. Exchange pawns with cxd4." },
                  { san: "Nxd4", description: "White recaptures with the knight." },
                  { san: "Nf6", description: "White recaptured. Develop to f6, attacking e4." },
                  { san: "Nc3", description: "White defends e4 with Nc3." },
                  { san: "e5", description: "White defended e4. Strike the center with e5, the defining Sveshnikov move — accepting a backward d-pawn for huge piece activity." },
                  { san: "Ndb5", description: "White jumps the knight to b5, eyeing d6." },
                  { san: "d6", description: "White attacked d6. Defend with d6 — the standard Sveshnikov main line." },
                ),
              },
            ],
          },
          {
            san: "c3",
            description: "White plays the Alapin (anti-Sicilian), supporting a future d4 push rather than developing pieces.",
            lineName: "Alapin Variation",
            lineDescription: "Anti-Sicilian with 2.c3",
            variations: line(
              { san: "d5", description: "White played c3 with d4 in mind. Strike first with d5 — the principled response that exploits the blocked c3 square." },
              { san: "exd5", description: "White captures on d5." },
              { san: "Qxd5", description: "White grabbed your pawn. Recapture with the queen (Qxd5) since c3 blocks the natural Nc3 attack." },
              { san: "d4", description: "White completes their plan with d4." },
              { san: "Nf6", description: "White played d4. Develop with Nf6, eyeing central squares." },
              { san: "Nf3", description: "White develops with Nf3, attacking your queen." },
              { san: "Bg4", description: "White attacked your queen. Develop actively with Bg4, pinning the knight on f3." },
            ),
          },
        ],
      },
    ],
  },
];

// ─── French Defense ──────────────────────────────────────────
const frenchTree: TreeMove[] = [
  {
    san: "e4",
    description: "White opens with e4.",
    variations: [
      {
        san: "e6",
        description: "White played e4. Play the solid French Defense with e6.",
        variations: [
          {
            san: "d4",
            description: "White builds a big center with d4.",
            variations: [
              {
                san: "d5",
                description: "White played d4. Challenge their center immediately with d5.",
                variations: [
                  {
                    san: "Nc3",
                    description: "White defends e4 with Nc3.",
                    variations: [
                      {
                        san: "Bb4",
                        description: "White played Nc3. Play the Winawer (Bb4) to pin the knight and pressure e4.",
                        lineName: "Winawer Variation",
                        lineDescription: "Sharp line with Bb4",
                        variations: line(
                          { san: "e5", description: "White advances to e5, gaining space." },
                          { san: "c5", description: "White pushed e5. Counter-attack the base of their pawn chain with c5." },
                          { san: "a3", description: "White asks the bishop to make a decision with a3." },
                          { san: "Bxc3+", description: "White played a3. Capture the knight (Bxc3+) to double White's pawns!" },
                          { san: "bxc3", description: "White recaptures with the b-pawn." },
                          { san: "Ne7", description: "White's pawn structure is damaged. Develop your knight flexibly to e7." },
                        ),
                      },
                      {
                        san: "Nf6",
                        description: "White played Nc3. Play the Classical variation by developing your knight to f6 to attack e4.",
                        lineName: "Classical Variation",
                        lineDescription: "Solid development with Nf6",
                        variations: line(
                          { san: "Bg5", description: "White pins your knight with Bg5!" },
                          { san: "Be7", description: "White played Bg5. Break the pin by developing your bishop to e7." },
                          { san: "e5", description: "White advances to e5 to gain space." },
                          { san: "Nfd7", description: "White pushed e5. Retreat your attacked knight to d7." },
                          { san: "Bxe7", description: "White trades bishops on e7." },
                          { san: "Qxe7", description: "White traded bishops. Recapture with your queen (Qxe7) to centralize it." },
                        ),
                      },
                      {
                        san: "dxe4",
                        description: "White played Nc3. Simplify with the solid Rubinstein, capturing on e4 to relieve central tension.",
                        lineName: "Rubinstein Variation",
                        lineDescription: "Solid simplification with 3...dxe4",
                        variations: line(
                          { san: "Nxe4", description: "White recaptures with the knight." },
                          { san: "Nd7", description: "White centralized the knight. Develop with Nd7, preparing Ngf6 without blocking your bishop." },
                          { san: "Nf3", description: "White develops naturally with Nf3." },
                          { san: "Ngf6", description: "White developed. Bring your other knight to f6, challenging the centralized white knight." },
                          { san: "Nxf6+", description: "White trades knights on f6." },
                          { san: "Nxf6", description: "White traded knights. Recapture with your knight, keeping a sound structure." },
                          { san: "Bd3", description: "White develops the bishop to d3, aiming at h7." },
                        ),
                      },
                    ],
                  },
                  {
                    san: "e5",
                    description: "White plays the Advance Variation (e5) to gain space.",
                    lineName: "Advance Variation",
                    lineDescription: "White advances in the center",
                    variations: line(
                      { san: "c5", description: "White pushed e5. Immediately attack the d4 pawn with c5!" },
                      { san: "c3", description: "White supports d4 with c3." },
                      { san: "Nc6", description: "White solidified with c3. Develop your knight to c6 to add pressure to d4." },
                      { san: "Nf3", description: "White develops to f3." },
                      { san: "Qb6", description: "White played Nf3. Bring your queen to b6 to pressure both d4 and b2!" },
                      { san: "a3", description: "White defends b2 prophylactically with a3." },
                      { san: "c4", description: "White played a3. Lock the queenside by pushing c4, a typical French plan." },
                    ),
                  },
                  {
                    san: "Nd2",
                    description: "White plays the flexible Tarrasch (Nd2), defending e4 without committing the c-pawn or blocking the bishop's diagonal.",
                    lineName: "Tarrasch Variation",
                    lineDescription: "Flexible defense of e4 with Nd2",
                    variations: line(
                      { san: "c5", description: "White played the Tarrasch. Strike the center immediately with c5 before White consolidates." },
                      { san: "exd5", description: "White captures on d5." },
                      { san: "exd5", description: "White grabbed your pawn. Recapture with the e-pawn (exd5) for active piece play; the alternative Qxd5 lets White get tempo with Ngf3." },
                      { san: "Ngf3", description: "White develops the knight to f3, attacking your hanging c5 pawn." },
                      { san: "Nc6", description: "White attacked c5. Defend it with Nc6 — natural development." },
                      { san: "Bb5", description: "White pins your knight with Bb5, threatening to weaken your pawn structure." },
                      { san: "Bd6", description: "White pinned your knight. Counter with Bd6, eyeing the kingside and preparing to castle." },
                    ),
                  },
                  {
                    san: "exd5",
                    description: "White plays the dry Exchange Variation, releasing tension and aiming for a symmetric, drawish structure.",
                    lineName: "Exchange Variation",
                    lineDescription: "Symmetric pawn structure after 3.exd5",
                    variations: line(
                      { san: "exd5", description: "White captured on d5. Recapture with the e-pawn to keep your structure symmetric." },
                      { san: "Nf3", description: "White develops naturally with Nf3." },
                      { san: "Nf6", description: "White developed. Match it with Nf6, eyeing central squares." },
                      { san: "Bd3", description: "White develops the bishop to d3." },
                      { san: "Bd6", description: "White played Bd3. Mirror with Bd6 — symmetry is fine for Black in this structure." },
                      { san: "O-O", description: "White castles." },
                      { san: "O-O", description: "White castled. Castle yourself (O-O) and prepare an equal middlegame." },
                    ),
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
];

// ─── Caro-Kann ───────────────────────────────────────────────
const caroKannTree: TreeMove[] = [
  {
    san: "e4",
    description: "White opens with e4.",
    variations: [
      {
        san: "c6",
        description: "White played e4. Play the Caro-Kann Defense (c6) to prepare d5 with pawn support.",
        variations: [
          {
            san: "d4",
            description: "White builds a classical center with d4.",
            variations: [
              {
                san: "d5",
                description: "White played d4. Strike the center fully supported by playing d5.",
                variations: [
                  {
                    san: "Nc3",
                    description: "White defends e4 with Nc3.",
                    variations: [
                      {
                        san: "dxe4",
                        description: "White played Nc3. Simplify the center by capturing on e4 (dxe4).",
                        variations: [
                          {
                            san: "Nxe4",
                            description: "White recaptures with the knight.",
                            variations: [
                              {
                                san: "Bf5",
                                description: "White recaptured. Develop your light-squared bishop to f5 before playing e6!",
                                lineName: "Main Line",
                                lineDescription: "The classical main line",
                                variations: line(
                                  { san: "Ng3", description: "White attacks your bishop with Ng3." },
                                  { san: "Bg6", description: "White attacked your bishop. Retreat to a safe square (Bg6) to keep the bishop pair." },
                                  { san: "h4", description: "White pushes h4, threatening to trap your bishop with h5!" },
                                  { san: "h6", description: "White threatens h5. Play h6 to give your bishop an escape square." },
                                ),
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                  {
                    san: "e5",
                    description: "White pushes e5, entering the Advance Variation.",
                    lineName: "Advance Variation",
                    lineDescription: "White advances the e-pawn",
                    variations: line(
                      { san: "Bf5", description: "White grabbed space with e5. Develop your light-squared bishop to f5 while you still can!" },
                      { san: "Nf3", description: "White develops naturally with Nf3." },
                      { san: "e6", description: "White played Nf3. Now that the bishop is out, play e6 to support d5." },
                      { san: "Be2", description: "White develops the bishop to e2." },
                      { san: "c5", description: "White played Be2. Attack the base of their center with c5." },
                      { san: "Be3", description: "White defends d4 with Be3." },
                      { san: "cxd4", description: "White played Be3. Exchange pawns (cxd4) to open lines." },
                    ),
                  },
                  {
                    san: "exd5",
                    description: "White plays the Exchange Variation by capturing on d5.",
                    lineName: "Exchange Variation",
                    lineDescription: "Simple development after exchanges",
                    variations: [
                      {
                        san: "cxd5",
                        description: "White captured on d5. Recapture (cxd5) to establish a symmetric pawn center.",
                        variations: [
                          ...line(
                            { san: "Bd3", description: "White develops the bishop to d3." },
                            { san: "Nc6", description: "White played Bd3. Develop your knight to c6 to pressure d4." },
                            { san: "c3", description: "White supports d4 with c3." },
                            { san: "Nf6", description: "White played c3. Develop naturally with Nf6." },
                            { san: "Bf4", description: "White develops their bishop actively to f4." },
                            { san: "Bg4", description: "White played Bf4. Develop actively and pin the knight by playing Bg4." },
                          ),
                          {
                            san: "c4",
                            description: "White plays the aggressive Panov Attack, pushing c4 to challenge your d5 pawn and open the position.",
                            lineName: "Panov Attack",
                            lineDescription: "Sharp central attack with c4",
                            variations: line(
                              { san: "Nf6", description: "White played c4. Develop with Nf6, defending d5 and challenging the c4 pawn." },
                              { san: "Nc3", description: "White adds a second attacker to d5 with Nc3." },
                              { san: "e6", description: "White attacked d5 twice. Support it with e6 — the most solid response." },
                              { san: "Nf3", description: "White develops the knight to f3." },
                              { san: "Be7", description: "White developed naturally. Develop your bishop to e7 and prepare to castle." },
                              { san: "cxd5", description: "White resolves the central tension by capturing on d5." },
                              { san: "Nxd5", description: "White captured. Recapture with the knight to keep an active piece on d5." },
                            ),
                          },
                        ],
                      },
                    ],
                  },
                  {
                    san: "f3",
                    description: "White plays the rare but tricky Fantasy Variation, supporting e4 with the f-pawn and aiming for an early Bf4 or a strong center.",
                    lineName: "Fantasy Variation",
                    lineDescription: "White supports e4 with 3.f3",
                    variations: line(
                      { san: "dxe4", description: "White played f3. Strike first by capturing on e4 — Black equalizes by liquidating the center." },
                      { san: "fxe4", description: "White recaptures with the f-pawn." },
                      { san: "e5", description: "White accepted a backward d-pawn. Cramp it with e5, seizing space and limiting White's bishop." },
                      { san: "Nf3", description: "White develops the knight to f3." },
                      { san: "Bg4", description: "White developed. Pin the knight with Bg4 to pressure White's center." },
                      { san: "Bc4", description: "White develops the bishop to c4." },
                      { san: "Nd7", description: "White developed actively. Bring out your knight to d7, preparing Ngf6 with a solid setup." },
                    ),
                  },
                ],
              },
            ],
          },
          {
            san: "Nc3",
            description: "White plays the Two Knights Attack, sidestepping the main lines and aiming for a more flexible setup.",
            lineName: "Two Knights Attack",
            lineDescription: "White plays Nc3 on move 2",
            variations: line(
              { san: "d5", description: "White played Nc3 instead of d4. Challenge the center anyway with d5 — White can't easily push d4 now." },
              { san: "Nf3", description: "White develops actively with Nf3." },
              { san: "Bg4", description: "White developed both knights. Pin the f3 knight with Bg4, pressuring e4 indirectly." },
              { san: "h3", description: "White asks your bishop with h3." },
              { san: "Bxf3", description: "White attacked your bishop. Capture the knight (Bxf3) to inflict doubled pawns." },
              { san: "Qxf3", description: "White recaptures with the queen." },
              { san: "e6", description: "White has the bishop pair but a damaged structure. Solidify with e6 and develop normally." },
            ),
          },
        ],
      },
    ],
  },
];

// ─── King's Indian ───────────────────────────────────────────
const kingsIndianTree: TreeMove[] = [
  {
    san: "d4",
    description: "White opens with the queen's pawn to d4.",
    variations: [
      {
        san: "Nf6",
        description: "White played d4. Develop your knight to f6, controlling e4 and staying flexible — there's no rush to occupy the center yourself.",
        variations: [
          {
            san: "c4",
            description: "White grabs more space and clamps down on d5 with c4.",
            variations: [
              {
                san: "g6",
                description: "White played c4. Begin the King's Indian setup with g6, preparing to fianchetto your bishop on the long diagonal.",
                variations: [
                  {
                    san: "Nc3",
                    description: "White develops the knight to c3, reinforcing the center and preparing e4.",
                    variations: [
                      {
                        san: "Bg7",
                        description: "White played Nc3. Complete the fianchetto with Bg7 — the bishop eyes the center and supports a later ...e5 break.",
                        variations: [
                          {
                            san: "e4",
                            description: "White seizes the full classical center with e4, exactly what the King's Indian invites.",
                            variations: [
                              {
                                san: "d6",
                                description: "White built a broad pawn center. Play d6 to restrain e5 and keep your position flexible before counter-attacking.",
                                variations: [
                                  // ── 5.Nf3: Classical Variation ──
                                  {
                                    san: "Nf3",
                                    description: "White develops naturally with Nf3, entering the Classical Variation — the main battleground of the King's Indian.",
                                    lineName: "Classical Variation",
                                    lineDescription: "White's principled setup; Black storms the kingside while White expands on the queenside.",
                                    variations: [
                                      {
                                        san: "O-O",
                                        description: "White played Nf3. Castle (O-O) to safety before launching your central counterplay.",
                                        variations: [
                                          {
                                            san: "Be2",
                                            description: "White develops the bishop modestly to e2 and prepares to castle.",
                                            variations: [
                                              {
                                                san: "e5",
                                                description: "White played Be2. Strike at the heart of the center with e5 — the defining King's Indian break, challenging d4 head-on.",
                                                variations: [
                                                  {
                                                    san: "O-O",
                                                    description: "White calmly castles, keeping the central tension and steering toward a rich middlegame.",
                                                    variations: [
                                                      {
                                                        san: "Nc6",
                                                        description: "White castled. Develop with Nc6, piling pressure on d4 and provoking White to commit with d5.",
                                                        variations: [
                                                          {
                                                            san: "d5",
                                                            description: "White grabs space and closes the center with d5, kicking your knight away.",
                                                            variations: [
                                                              {
                                                                san: "Ne7",
                                                                description: "White pushed d5. Reroute the knight to e7, where it supports the coming ...f5 break and can swing to g6.",
                                                                variations: [
                                                                  {
                                                                    san: "Ne1",
                                                                    description: "White begins the classical maneuver Ne1–d3, rerouting the knight to bolster the queenside and eye c5 and f4.",
                                                                    lineName: "Classical: Mar del Plata",
                                                                    lineDescription: "The famous race — Black attacks the king while White storms the queenside.",
                                                                    variations: line(
                                                                      { san: "Nd7", description: "White rerouted to e1. Play Nd7 to clear the f-pawn's path for the kingside avalanche." },
                                                                      { san: "Nd3", description: "White completes the maneuver with Nd3, pressing on c5 and f4." },
                                                                      { san: "f5", description: "White played Nd3. Launch the thematic pawn storm with f5, opening lines toward White's king." },
                                                                      { san: "f3", description: "White bolsters e4 with f3 and braces for the coming kingside assault." },
                                                                      { san: "f4", description: "White played f3. Lock the kingside with f4, gaining space and entombing White's dark-squared bishop." },
                                                                      { san: "Bd2", description: "White redeploys the bishop to d2, clearing the way for Rc1 and the c5 break." },
                                                                      { san: "g5", description: "White played Bd2. Roll forward with g5 — your pawns surge toward g4 and h4 to crack open White's king." },
                                                                      { san: "Rc1", description: "White prepares the queenside break with Rc1, supporting c5." },
                                                                      { san: "Ng6", description: "White played Rc1. Maneuver the knight to g6, reinforcing the kingside push and preparing ...Rf7 and ...Bf8." },
                                                                    ),
                                                                  },
                                                                  {
                                                                    san: "b4",
                                                                    description: "White launches the modern Bayonet Attack, grabbing queenside space at once with b4.",
                                                                    lineName: "Classical: Bayonet Attack",
                                                                    lineDescription: "White's most respected weapon — a fast b4 to accelerate the queenside.",
                                                                    variations: line(
                                                                      { san: "Nh5", description: "White played b4. Hop the knight to h5, clearing the f-pawn and eyeing the f4 outpost." },
                                                                      { san: "Re1", description: "White overprotects e4 and sidesteps ...Nf4 ideas with Re1." },
                                                                      { san: "f5", description: "White played Re1. Open the kingside with f5 to get your attack rolling." },
                                                                      { san: "Ng5", description: "White jumps the knight to g5, probing the e6 and f7 squares." },
                                                                      { san: "Nf6", description: "White played Ng5. Calmly retreat the knight to f6, shoring up the kingside and keeping your structure intact." },
                                                                      { san: "Bf3", description: "White redeploys the bishop to f3, pressing on the long diagonal and reinforcing e4." },
                                                                      { san: "c6", description: "White played Bf3. Undermine the d5 chain with c6, opening queenside lines before White's attack lands." },
                                                                    ),
                                                                  },
                                                                  {
                                                                    san: "Nd2",
                                                                    description: "White reroutes via Nd2 toward c4 and b3, supporting a quick c5 break.",
                                                                    lineName: "Classical: Nd2 System",
                                                                    lineDescription: "White's flexible knight retreat to d2 instead of e1.",
                                                                    variations: line(
                                                                      { san: "a5", description: "White played Nd2. Grab queenside space with a5, restraining b4 and the c5 break." },
                                                                      { san: "a3", description: "White prepares to expand anyway, tucking the pawn to a3 in support of b4." },
                                                                      { san: "Nd7", description: "White played a3. Reposition with Nd7, clearing the f-pawn for the kingside push." },
                                                                      { san: "Rb1", description: "White lines the rook up on b1, readying the b4 advance." },
                                                                      { san: "f5", description: "White played Rb1. Strike on the kingside with f5 — your attack must keep pace with White's." },
                                                                      { san: "b4", description: "White breaks through on the queenside with b4." },
                                                                      { san: "axb4", description: "White played b4. Capture with axb4 to open the a-file for your rook." },
                                                                      { san: "axb4", description: "White recaptures with axb4, and the queenside battle is fully joined." },
                                                                    ),
                                                                  },
                                                                ],
                                                              },
                                                            ],
                                                          },
                                                        ],
                                                      },
                                                    ],
                                                  },
                                                  {
                                                    san: "dxe5",
                                                    description: "White releases the tension with dxe5, steering toward a symmetrical, queenless endgame.",
                                                    lineName: "Classical: Exchange Variation",
                                                    lineDescription: "White trades on e5 and offers an early queen swap for a quiet endgame.",
                                                    variations: line(
                                                      { san: "dxe5", description: "White captured on e5. Recapture with dxe5, keeping a healthy pawn on e5 and an open d-file." },
                                                      { san: "Qxd8", description: "White offers the queen trade with Qxd8 — the whole point of the exchange line." },
                                                      { san: "Rxd8", description: "White traded queens. Recapture with Rxd8; the endgame is only marginally better for White and very holdable." },
                                                      { san: "Nd5", description: "White centralizes the knight to d5, hitting your f6 knight and the c7 square." },
                                                      { san: "Nxd5", description: "White played Nd5. Trade it off with Nxd5 to ease your position." },
                                                      { san: "cxd5", description: "White recaptures with cxd5, locking the pawn structure." },
                                                      { san: "c6", description: "White played cxd5. Strike at the d5 pawn with c6 to free your pieces and activate your position." },
                                                    ),
                                                  },
                                                  {
                                                    san: "d5",
                                                    description: "White plays the Petrosian System, locking the center immediately with d5 to blunt the ...e5 break.",
                                                    lineName: "Classical: Petrosian System",
                                                    lineDescription: "White closes the center early with d5 for a strategic maneuvering battle.",
                                                    variations: line(
                                                      { san: "a5", description: "White locked the center with d5. Play a5 to clamp down on b4 and secure the c5 square for your pieces." },
                                                      { san: "Bg5", description: "White pins your knight with Bg5, pressuring the kingside." },
                                                      { san: "h6", description: "White played Bg5. Question the bishop with h6, gaining a tempo and a little luft." },
                                                      { san: "Bh4", description: "White maintains the pin with Bh4." },
                                                      { san: "Na6", description: "White kept the pin. Develop the knight to a6, heading for the strong c5 outpost." },
                                                      { san: "Nd2", description: "White reroutes the knight to d2, eyeing c4 to challenge your queenside plans." },
                                                      { san: "Qe8", description: "White played Nd2. Tuck the queen to e8, unpinning the knight and preparing ...Nh7 and ...f5." },
                                                    ),
                                                  },
                                                  {
                                                    san: "Be3",
                                                    description: "White plays the Gligorić System, developing Be3 to support d4 and meet ...Ng4 with Bg5.",
                                                    lineName: "Classical: Gligorić System",
                                                    lineDescription: "White develops the bishop to e3, leading to sharp piece play.",
                                                    variations: line(
                                                      { san: "Ng4", description: "White played Be3. Harass the bishop with Ng4, forcing it to declare its intentions." },
                                                      { san: "Bg5", description: "White sidesteps to g5, keeping the bishop active and pinning ideas alive." },
                                                      { san: "f6", description: "White played Bg5. Kick the bishop with f6, gaining space and preparing to reroute your knight." },
                                                      { san: "Bc1", description: "White retreats all the way to c1, conceding a tempo but keeping the bishop pair." },
                                                      { san: "Nh6", description: "White retreated to c1. Reroute the knight via h6 toward f7, eyeing the kingside and supporting ...f5." },
                                                      { san: "Nd2", description: "White repositions the knight to d2, reinforcing e4 and preparing queenside expansion." },
                                                      { san: "Nf7", description: "White played Nd2. Complete the maneuver with Nf7, where the knight guards e5 and supports the ...f5 break." },
                                                    ),
                                                  },
                                                ],
                                              },
                                            ],
                                          },
                                        ],
                                      },
                                    ],
                                  },
                                  // ── 5.f3: Sämisch Variation ──
                                  {
                                    san: "f3",
                                    description: "White plays the Sämisch, the solid f3 to over-protect e4 and prepare a kingside pawn storm of its own.",
                                    lineName: "Sämisch Variation",
                                    lineDescription: "White supports e4 with f3 and often castles queenside.",
                                    variations: [
                                      {
                                        san: "O-O",
                                        description: "White played f3. Castle (O-O); the weakened light squares around f3 will give you attacking chances later.",
                                        variations: [
                                          {
                                            san: "Be3",
                                            description: "White develops the bishop to e3, bracing d4 and preparing Qd2 with queenside castling.",
                                            variations: [
                                              {
                                                san: "e5",
                                                description: "White played Be3. Strike the center with e5, the classical King's Indian break.",
                                                variations: line(
                                                  { san: "Nge2", description: "White develops the knight to e2, maintaining the central tension and keeping f3 free for the pawn." },
                                                  { san: "c6", description: "White played Nge2. Prepare queenside play with c6, readying ...b5 and supporting a later ...d5 or ...exd4." },
                                                  { san: "Qd2", description: "White connects the rooks with Qd2 and prepares to castle long." },
                                                  { san: "Nbd7", description: "White played Qd2. Develop the knight to d7, eyeing c5 and supporting your central pawns." },
                                                  { san: "O-O-O", description: "White castles queenside, committing to opposite-wing attacks." },
                                                  { san: "a6", description: "White castled long. Start your attack with a6, preparing the ...b5 pawn storm against White's king." },
                                                  { san: "Kb1", description: "White tucks the king to b1, a useful prophylactic step before the storm." },
                                                  { san: "b5", description: "White played Kb1. Open the assault with b5 — the race against White's kingside pawns is on!" },
                                                ),
                                              },
                                              {
                                                san: "c5",
                                                description: "White played Be3. Counter sharply with c5, hitting d4 and steering into Benoni-style play with a pawn sacrifice.",
                                                lineName: "Sämisch: Benoni Counter",
                                                lineDescription: "Black gambits a pawn with ...c5 for active piece play.",
                                                variations: line(
                                                  { san: "dxc5", description: "White accepts the challenge with dxc5." },
                                                  { san: "dxc5", description: "White played dxc5. Recapture with dxc5, opening the d-file and offering a queen trade." },
                                                  { san: "Qxd8", description: "White trades queens with Qxd8." },
                                                  { san: "Rxd8", description: "White traded queens. Recapture with Rxd8, keeping the rook active on the open file." },
                                                  { san: "Bxc5", description: "White grabs the c5 pawn with Bxc5." },
                                                  { san: "Nc6", description: "White won a pawn but is behind in development. Hit back with Nc6 — your bishop pair and active rooks give full compensation." },
                                                ),
                                              },
                                            ],
                                          },
                                        ],
                                      },
                                    ],
                                  },
                                  // ── 5.f4: Four Pawns Attack ──
                                  {
                                    san: "f4",
                                    description: "White plays the ambitious Four Pawns Attack, throwing the f-pawn forward to build a massive pawn front.",
                                    lineName: "Four Pawns Attack",
                                    lineDescription: "White's most aggressive try — a huge center that Black aims to undermine.",
                                    variations: line(
                                      { san: "O-O", description: "White played f4. Castle (O-O) to safety; you'll strike at White's overextended center next." },
                                      { san: "Nf3", description: "White develops the knight to f3, supporting the big center." },
                                      { san: "c5", description: "White played Nf3. Counter-strike at the base of the center with c5, the principled response." },
                                      { san: "d5", description: "White advances with d5, gaining space and locking the center." },
                                      { san: "e6", description: "White played d5. Challenge the head of the pawn chain with e6 to pry open lines." },
                                      { san: "Be2", description: "White develops the bishop to e2, completing kingside development." },
                                      { san: "exd5", description: "White played Be2. Resolve the tension with exd5, opening the e-file for your rook." },
                                      { san: "cxd5", description: "White recaptures with cxd5, keeping the pawn chain intact." },
                                      { san: "Bg4", description: "White played cxd5. Pin the f3 knight with Bg4 to pressure d4 and White's center." },
                                      { san: "O-O", description: "White castles to safety." },
                                      { san: "Nbd7", description: "White castled. Develop the knight to d7, eyeing the c5 and e5 squares and completing your setup." },
                                    ),
                                  },
                                  // ── 5.Be2 (then Bg5): Averbakh Variation ──
                                  {
                                    san: "Be2",
                                    description: "White plays the Averbakh Variation, developing Be2 and quickly playing Bg5 to pin pieces and discourage ...e5.",
                                    lineName: "Averbakh Variation",
                                    lineDescription: "White pins with Bg5 after Be2.",
                                    variations: line(
                                      { san: "O-O", description: "White developed Be2. Castle (O-O) to prepare your counterplay." },
                                      { san: "Bg5", description: "White pins your knight with Bg5, threatening to ruin your structure and clamping down on ...e5." },
                                      { san: "c5", description: "White pinned the knight. Counter-strike at the center with c5 to challenge White's grip." },
                                      { san: "d5", description: "White locks the center with d5." },
                                      { san: "h6", description: "White closed the center. Kick the bishop with h6 to gain a tempo." },
                                      { san: "Be3", description: "White retreats the bishop to e3." },
                                      { san: "e6", description: "White retreated. Strike at the d5 chain with e6, opening lines on the queenside." },
                                      { san: "Qd2", description: "White connects the rooks with Qd2, eyeing the weakened dark squares." },
                                      { san: "exd5", description: "White played Qd2. Open the position with exd5 while you are better developed for the coming fight." },
                                      { san: "exd5", description: "White recaptures with exd5, leaving a Benoni-style structure where Black's pieces spring to life." },
                                    ),
                                  },
                                  // ── 5.h3: Makogonov Variation ──
                                  {
                                    san: "h3",
                                    description: "White plays the Makogonov System, the prophylactic h3 to prevent ...Ng4 and prepare a space-gaining g4.",
                                    lineName: "Makogonov Variation",
                                    lineDescription: "White's flexible h3 setup aiming for g4 and a queenside bind.",
                                    variations: line(
                                      { san: "O-O", description: "White played h3. Castle (O-O) and complete development before committing your pawns." },
                                      { san: "Be3", description: "White develops the bishop to e3, supporting d4 and the coming g4 push." },
                                      { san: "e5", description: "White played Be3. Strike in the center with e5, the standard King's Indian break." },
                                      { san: "d5", description: "White closes the center with d5, gaining space." },
                                      { san: "a5", description: "White played d5. Clamp down on b4 with a5, securing the c5 square for your knight." },
                                      { san: "g4", description: "White grabs kingside space with g4 — the whole point of the early h3." },
                                      { san: "Na6", description: "White played g4. Develop the knight to a6, rerouting toward the excellent c5 outpost." },
                                      { san: "Nge2", description: "White brings the knight to e2, supporting the kingside advance and freeing f3 for a piece." },
                                      { san: "Nc5", description: "White played Nge2. Plant the knight on c5, a powerful outpost that hits e4 and forces White to spend time defending it." },
                                    ),
                                  },
                                ],
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                  // ── 3.Nf3 (then g3): Fianchetto Variation ──
                  {
                    san: "Nf3",
                    description: "White develops flexibly with Nf3, steering toward the positional Fianchetto Variation.",
                    lineName: "Fianchetto Variation",
                    lineDescription: "White fianchettoes with g3 and Bg2 for a quieter, strategic battle.",
                    variations: [
                      {
                        san: "Bg7",
                        description: "White played Nf3. Complete your fianchetto with Bg7.",
                        variations: [
                          {
                            san: "g3",
                            description: "White prepares a kingside fianchetto of its own with g3 — the defining move of this variation.",
                            variations: [
                              {
                                san: "O-O",
                                description: "White fianchettoes too. Castle (O-O) to safety before committing to a plan.",
                                variations: [
                                  {
                                    san: "Bg2",
                                    description: "White completes the fianchetto with Bg2.",
                                    variations: [
                                      {
                                        san: "d6",
                                        description: "White's bishop eyes the long diagonal. Solidify with d6 to support a future ...e5 break.",
                                        variations: [
                                          {
                                            san: "O-O",
                                            description: "White castles, completing development.",
                                            variations: [
                                              {
                                                san: "Nbd7",
                                                description: "White castled. Develop the knight to d7, preparing the central ...e5 break in classical fashion.",
                                                lineName: "Fianchetto: Classical",
                                                lineDescription: "Black prepares ...e5 with the knight on d7.",
                                                variations: line(
                                                  { san: "Nc3", description: "White finally develops the queen's knight to c3, eyeing the center." },
                                                  { san: "e5", description: "White played Nc3. Strike with e5, contesting the center now that your pieces are ready." },
                                                  { san: "e4", description: "White grabs the center with e4, building the classical pawn duo." },
                                                  { san: "exd4", description: "White played e4. Release the tension with exd4, inviting White to recapture and opening lines for your rook." },
                                                  { san: "Nxd4", description: "White recaptures with the knight, centralizing on d4." },
                                                  { san: "Re8", description: "White played Nxd4. Pressure e4 with Re8, a typical rook lift onto the open file." },
                                                  { san: "h3", description: "White plays h3 to deny your pieces the g4 square." },
                                                  { san: "a6", description: "White played h3. Prepare queenside expansion with a6, readying ...Rb8 and ...b5." },
                                                ),
                                              },
                                              {
                                                san: "Nc6",
                                                description: "White castled. Develop actively with Nc6, the Panno Variation, aiming for quick queenside play with ...a6 and ...Rb8.",
                                                lineName: "Fianchetto: Panno Variation",
                                                lineDescription: "Black develops Nc6 for a fast ...a6 and ...b5 queenside expansion.",
                                                variations: line(
                                                  { san: "Nc3", description: "White develops the queen's knight to c3." },
                                                  { san: "a6", description: "White played Nc3. Begin queenside expansion with a6, preparing ...Rb8 and ...b5." },
                                                  { san: "d5", description: "White gains space and kicks your knight with d5." },
                                                  { san: "Na5", description: "White played d5. Hop to a5, attacking the c4 pawn and heading for queenside activity." },
                                                  { san: "Nd2", description: "White defends c4 with Nd2, eyeing the b3 and e4 squares." },
                                                  { san: "c5", description: "White played Nd2. Lock in your knight and grab space with c5." },
                                                  { san: "Qc2", description: "White defends c4 again and prepares to meet ...b5." },
                                                  { san: "Rb8", description: "White played Qc2. Line up the rook on b8 to back up the ...b5 break." },
                                                  { san: "b3", description: "White reinforces c4 and the queenside with b3." },
                                                  { san: "b5", description: "White played b3. Strike with b5, opening the queenside where your pieces are aimed!" },
                                                ),
                                              },
                                            ],
                                          },
                                        ],
                                      },
                                    ],
                                  },
                                ],
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
];

// ─── English Opening ─────────────────────────────────────────
const englishTree: TreeMove[] = [
  {
    san: "c4",
    description: "Open flexibly with the English Opening by playing c4.",
    variations: [
      {
        san: "c5",
        description: "Black mirrors your approach with c5.",
        lineName: "Symmetrical Variation",
        lineDescription: "Black mirrors with c5",
        variations: line(
          { san: "Nc3", description: "Black played symmetrically. Develop your knight to c3." },
          { san: "Nc6", description: "Black develops symmetrically with Nc6." },
          { san: "g3", description: "Black played Nc6. Prepare to fianchetto your bishop by playing g3." },
          { san: "g6", description: "Black also prepares a fianchetto with g6." },
          { san: "Bg2", description: "Black mirrored you. Complete your fianchetto with Bg2." },
          { san: "Bg7", description: "Black completes their fianchetto with Bg7." },
          { san: "Nf3", description: "Black played Bg7. Develop your kingside knight to f3." },
          { san: "Nf6", description: "Black develops to f6." },
          { san: "O-O", description: "Black played Nf6. Castle (O-O) to safety." },
          { san: "O-O", description: "Black castles to secure a solid, symmetrical position." },
        ),
      },
      {
        san: "Nf6",
        description: "Black develops their knight to f6.",
        lineName: "King's English",
        lineDescription: "Black plays Nf6",
        variations: line(
          { san: "Nc3", description: "Black played Nf6. Develop your knight to c3." },
          { san: "e5", description: "Black grabs central space with e5." },
          { san: "Nf3", description: "Black played e5. Develop your other knight to f3, attacking the e5 pawn." },
          { san: "Nc6", description: "Black defends e5 with Nc6." },
          { san: "g3", description: "Black defended the pawn. Prepare the fianchetto with g3." },
          { san: "d5", description: "Black strikes in the center with d5 while you are fianchettoing!" },
          { san: "cxd5", description: "Black played d5. Capture the pawn with cxd5." },
          { san: "Nxd5", description: "Black recaptures with the knight." },
          { san: "Bg2", description: "Black centralized their knight. Complete your fianchetto with Bg2." },
          { san: "Nb6", description: "Black retreats the knight to a stable square on b6." },
        ),
      },
      {
        san: "e5",
        description: "Black grabs central space with e5, entering a Reversed Sicilian.",
        lineName: "Reversed Sicilian",
        lineDescription: "White plays a Sicilian with extra tempo",
        variations: line(
          { san: "Nc3", description: "Black played e5. Develop your knight to c3." },
          { san: "Nf6", description: "Black develops to f6." },
          { san: "Nf3", description: "Black played Nf6. Develop your other knight to f3, attacking e5." },
          { san: "Nc6", description: "Black defends e5 with Nc6." },
          { san: "g3", description: "Black defended e5. Prepare to fianchetto by playing g3." },
          { san: "d5", description: "Black pushes for central control with d5!" },
          { san: "cxd5", description: "Black played d5. Capture the pawn with cxd5." },
          { san: "Nxd5", description: "Black recaptures with their knight." },
          { san: "Bg2", description: "Black centralized their knight. Complete development with Bg2." },
          { san: "Nb6", description: "Black retreats to a safe square on b6." },
        ),
      },
      {
        san: "f5",
        description: "Black plays the sharp Anglo-Dutch Defense, immediately fighting for kingside squares with f5.",
        lineName: "Anglo-Dutch Defense",
        lineDescription: "Aggressive Dutch-style setup against the English",
        variations: line(
          { san: "Nc3", description: "Black launched f5. Develop your knight to c3 to overprotect the center." },
          { san: "Nf6", description: "Black develops with Nf6." },
          { san: "g3", description: "Black developed. Prepare to fianchetto with g3 — the most flexible setup against the Dutch." },
          { san: "g6", description: "Black mirrors with g6, heading for a Leningrad-style fianchetto." },
          { san: "Bg2", description: "Black mirrored. Complete your fianchetto with Bg2 — your bishop will be very strong on the long diagonal." },
          { san: "Bg7", description: "Black completes the fianchetto." },
          { san: "d3", description: "Black is set up. Play the patient d3, keeping options open for both e4 and d4 breaks." },
        ),
      },
      {
        san: "e6",
        description: "Black plays e6, preparing a French-style setup or transposition to a Queen's Indian.",
        lineName: "Mikenas-Carls Variation",
        lineDescription: "Aggressive 3.e4 against Black's e6",
        variations: line(
          { san: "Nc3", description: "Black played e6. Develop your knight to c3 — this is the move that allows the sharp e4 push." },
          { san: "Nf6", description: "Black develops to f6." },
          { san: "e4", description: "Black played Nf6. Strike the center with e4 — the defining move of the Mikenas-Carls!" },
          { san: "d5", description: "Black challenges the center with d5." },
          { san: "e5", description: "Black struck with d5. Advance and gain space with e5, kicking the knight." },
          { san: "Ne4", description: "Black sidesteps with Ne4, attacking your c3 knight." },
          { san: "Nxe4", description: "Black grabbed the c3 knight. Trade off with Nxe4 to maintain your space advantage." },
        ),
      },
    ],
  },
];

// ─── Export: tree as source of truth, lines derived ────────────
interface OpeningMeta {
  id: string;
  name: string;
  description: string;
  tree: TreeMove[];
}

const openingsWithTrees: OpeningMeta[] = [
  { id: "italian-game", name: "Italian Game", description: "A classical opening focusing on rapid development and central control.", tree: italianTrunk },
  { id: "queens-gambit", name: "Queen's Gambit", description: "A strategic opening offering a pawn to gain central control.", tree: queensGambitTree },
  { id: "ruy-lopez", name: "Ruy López (Spanish Opening)", description: "One of the oldest and most respected openings in chess.", tree: ruyLopezTree },
  { id: "sicilian-defense", name: "Sicilian Defense", description: "Black's most popular and aggressive response to 1.e4.", tree: sicilianTree },
  { id: "french-defense", name: "French Defense", description: "A solid defense leading to strategic middlegames.", tree: frenchTree },
  { id: "caro-kann", name: "Caro-Kann Defense", description: "A reliable defense avoiding the tactical complications of other defenses.", tree: caroKannTree },
  { id: "kings-indian", name: "King's Indian Defense", description: "A hypermodern defense allowing White central control to attack later.", tree: kingsIndianTree },
  { id: "english-opening", name: "English Opening", description: "A flexible opening starting with 1.c4.", tree: englishTree },
];

/** Openings with lines derived from the tree. No redundancy in source data. */
export const openingsData: Opening[] = openingsWithTrees.map((o) => ({
  id: o.id,
  name: o.name,
  description: o.description,
  lines: linesFromTree(o.tree),
}));
