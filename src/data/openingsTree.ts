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
                          { san: "Bb4+", description: "Black can't save both: ...Kxf7 is illegal (your Bc4 covers f7), so Black lashes out with a desperation check." },
                          { san: "c3", description: "Black played Bb4+. Block with c3, hitting the bishop. Black must deal with it while your knight collects the h8 rook — you're winning the exchange and a pawn." },
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
                          { san: "Nc3", description: "Black played Ne7. Don't rush exf5 — it releases the tension and lets Black equalize. Develop with Nc3, keeping the bind and leaving Black's loose f5/e5 pawns to worry about." },
                          { san: "Na5", description: "Black tries to trade off your strong Italian bishop with Na5." },
                          { san: "Nxe5", description: "Black played Na5, abandoning e5. Punish it immediately with Nxe5, snatching the pawn." },
                          { san: "Nxc4", description: "Black takes your bishop on c4." },
                          { san: "Nxc4", description: "Black traded on c4. Recapture with the knight — you're a clean pawn up with the better structure." },
                          { san: "fxe4", description: "Black regains a pawn with fxe4." },
                          { san: "O-O", description: "Black played fxe4. Castle. Your knights dominate the open position and Black's shattered kingside gives you a lasting edge (about +2.5)." },
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

// ─── Anti-Scandinavian (White) ───────────────────────────────
// White's reply when a 1.e4 opponent answers with the Scandinavian (1...d5).
// Its own opening rather than a Ruy López branch: 1...d5 is ~8.9% of Black's
// replies to 1.e4, and the lines share no moves with the Ruy López.
const antiScandinavianBranch: TreeMove = {
  san: "d5",
  description: "Black answers with the Scandinavian Defense (Center Counter), striking at your e4 pawn at once.",
  variations: [
    {
      san: "exd5",
      description: "Black played d5. Capture with exd5 — the principled reply; now Black must spend time regaining the pawn.",
      variations: [
        {
          san: "Qxd5",
          description: "Black recaptures with the queen, the most common choice — but it brings the queen out early.",
          lineName: "Scandinavian: 2...Qxd5",
          lineDescription: "Black recaptures with the queen; you develop with tempo by hitting it.",
          variations: [
            {
              san: "Nc3",
              description: "Black brought the queen out. Develop Nc3 with tempo, attacking the queen and gaining a free developing move!",
              variations: [
                {
                  san: "Qa5",
                  description: "Black retreats to a5, the main line, eyeing the a5–e1 diagonal.",
                  lineName: "Scandinavian: 3...Qa5 Main Line",
                  lineDescription: "The classical main line; develop naturally and castle queenside.",
                  variations: line(
                    { san: "d4", description: "Black retreated to a5. Take the full center with d4, gaining space for free." },
                    { san: "Nf6", description: "Black develops the knight to f6." },
                    { san: "Nf3", description: "Black played Nf6. Develop your knight to f3." },
                    { san: "c6", description: "Black plays c6, giving the queen a retreat and preparing ...Bf5." },
                    { san: "Bc4", description: "Black played c6. Develop the bishop actively to c4, eyeing f7." },
                    { san: "Bf5", description: "Black develops the bishop to f5 before locking it in with ...e6." },
                    { san: "Bd2", description: "Black developed the bishop. Play Bd2, connecting your pieces and preparing to castle long." },
                    { san: "e6", description: "Black plays e6, opening the dark-squared bishop." },
                    { san: "Qe2", description: "Black played e6. Bring the queen to e2, clearing d1 for the rook and readying queenside castling." },
                    { san: "Bb4", description: "Black pins your c3 knight with Bb4." },
                    { san: "O-O-O", description: "Black pinned the knight. Castle queenside (O-O-O)! Your rooks come to the center and you enjoy a comfortable space and development edge." },
                  ),
                },
                {
                  san: "Qd6",
                  description: "Black plays the modern Qd6, a flexible square that keeps the queen active but safe.",
                  lineName: "Scandinavian: 3...Qd6",
                  lineDescription: "The modern main line; build a big center and fianchetto.",
                  variations: line(
                    { san: "d4", description: "Black retreated to d6. Seize the center with d4." },
                    { san: "Nf6", description: "Black develops to f6." },
                    { san: "Nf3", description: "Black played Nf6. Develop your knight to f3." },
                    { san: "a6", description: "Black plays a6, stopping Nb5 and preparing ...b5." },
                    { san: "g3", description: "Black played a6. Fianchetto with g3 — your bishop will be strong against Black's queenside expansion." },
                    { san: "b5", description: "Black grabs queenside space with b5." },
                    { san: "Bg2", description: "Black played b5. Complete the fianchetto with Bg2." },
                    { san: "Bb7", description: "Black mirrors with Bb7 on the long diagonal." },
                    { san: "O-O", description: "Black fianchettoed. Castle (O-O); your harmonious setup gives you an easy, pleasant game." },
                    { san: "e6", description: "Black plays e6, completing development." },
                  ),
                },
                {
                  san: "Qd8",
                  description: "Black retreats all the way home to d8 — solid but very passive.",
                  lineName: "Scandinavian: 3...Qd8",
                  lineDescription: "The passive retreat; you get a free hand in the center.",
                  variations: line(
                    { san: "d4", description: "Black retreated to d8, the most passive square. Take the big center with d4 and enjoy a clear lead in development." },
                    { san: "Nf6", description: "Black develops to f6." },
                    { san: "Nf3", description: "Black played Nf6. Develop your knight to f3." },
                    { san: "g6", description: "Black prepares a kingside fianchetto with g6." },
                    { san: "Bc4", description: "Black is fianchettoing. Develop the bishop actively to c4, eyeing f7." },
                    { san: "Bg7", description: "Black completes the fianchetto with Bg7." },
                    { san: "O-O", description: "Black fianchettoed. Castle (O-O) — you are fully developed with more space and an easy game." },
                    { san: "O-O", description: "Black castles." },
                  ),
                },
              ],
            },
          ],
        },
        {
          san: "Nf6",
          description: "Black plays the Modern Scandinavian, developing the knight and delaying the recapture on d5.",
          variations: [
            {
              san: "d4",
              description: "Black played Nf6. Grab the center with d4, holding the extra pawn for now and daring Black to win it back.",
              variations: [
                {
                  san: "Nxd5",
                  description: "Black regains the pawn with the knight, reaching a sound but slightly passive setup.",
                  lineName: "Scandinavian: 2...Nf6 Modern",
                  lineDescription: "Black recaptures on d5 with the knight; you keep a space edge.",
                  variations: line(
                    { san: "Nf3", description: "Black recaptured on d5. Develop your knight to f3 and prepare to castle." },
                    { san: "Bg4", description: "Black develops the bishop to g4, pinning your knight to the queen." },
                    { san: "Be2", description: "Black pinned your knight. Break the pin calmly with Be2." },
                    { san: "e6", description: "Black plays e6, opening the dark-squared bishop." },
                    { san: "O-O", description: "Black played e6. Castle (O-O); your pawn on d4 gives you a comfortable space advantage." },
                    { san: "Be7", description: "Black develops the bishop to e7 and prepares to castle." },
                  ),
                },
                {
                  san: "Bg4",
                  description: "Black plays the Portuguese Gambit, developing Bg4 and sacrificing the d5 pawn for activity.",
                  lineName: "Scandinavian: Portuguese Gambit",
                  lineDescription: "Black gambits with ...Bg4; decline the complications with the calm Be2.",
                  variations: line(
                    { san: "Be2", description: "Black offered the Portuguese Gambit. Sidestep the tricks by offering a trade with Be2." },
                    { san: "Bxe2", description: "Black captures on e2." },
                    { san: "Qxe2", description: "Black traded bishops. Recapture with Qxe2, keeping your development flowing." },
                    { san: "Qxd5", description: "Black finally regains the d5 pawn with the queen." },
                    { san: "Nf3", description: "Black grabbed the pawn back. Develop Nf3, eyeing the center." },
                    { san: "Nc6", description: "Black develops the knight to c6." },
                    { san: "c4", description: "Black played Nc6. Gain space and hit the queen with c4." },
                    { san: "Qd8", description: "Black retreats the queen to d8." },
                    { san: "d5", description: "Black retreated. Push d5! — kicking the knight before Black gets ...e6 in is far stronger than the routine Nc3, which lets Black free the position." },
                    { san: "Nb8", description: "The knight has to crawl back to b8." },
                    { san: "O-O", description: "Black's knight retreated to b8. Castle. Black has lost all coordination while you have a protected passed d-pawn and a big lead in development (about +1.9)." },
                  ),
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

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
                        san: "Bd6",
                        description: "Black plays the awkward Bd6, blocking in the d-pawn (1.2% here).",
                        lineName: "3...Bd6",
                        lineDescription: "Punished by force: d4 then e5 forks the bishop and knight, and with the d-pawn gone nothing can defend e5.",
                        variations: line(
                          { san: "O-O", description: "Black played Bd6, which blocks the d-pawn and leaves the bishop badly placed. Castle first — no need to rush, the problem with Bd6 isn't going away." },
                          { san: "Nf6", description: "Black develops the knight to f6." },
                          { san: "d4", description: "Black played Nf6. Now d4! Opening the centre is exactly what Black's blocked d-pawn cannot cope with." },
                          { san: "exd4", description: "Black captures on d4 — and note this is the move that dooms the position: the d-pawn has left d6 for good." },
                          { san: "e5", description: "Black played exd4. Now e5!! forking the d6 bishop and the f6 knight. Every reply loses at least a piece — Stockfish has Black at -3.1 for the best try and -4.5 for the worst — because with the d-pawn on d4 there is nothing left to defend e5, and Re1 collects whatever recaptures there." },
                          { san: "Nxe5", description: "Black takes with the knight, the least bad option." },
                          { san: "Nxe5", description: "Black played Nxe5. Recapture — Nxe5. Black CAN take again with the d6 bishop, but it loses to a pin, not a lack of defenders: after ...Bxe5, Re1 leaves the bishop with no legal moves at all — pinned to the king, attacked once, defended by nothing. Castling unpins but just drops it to Rxe5 (-3.5); defending with ...Qe7 walks into f4!, when the bishop has to step off the file and Rxe7+ wins the queen instead (-3.7)." },
                          { san: "a6", description: "Black's best try (-3.0): hitting your b5 bishop rather than recapturing on e5." },
                          { san: "Re1", description: "Black played a6, attacking your bishop — ignore it! Re1 seizes the e-file, and the b5 bishop is poisoned: ...axb5?? loses to Nc6+!, a discovered check from this rook while the knight forks the d8 queen — ...Be7 Nxd8 wins queen for bishop (+5.6). To be precise, you are only a pawn up in material here, but at +3.0 the position is winning: Black's king is stuck on the open file you now own." },
                        ),
                      },
                      {
                        san: "Qf6",
                        description: "Black defends e5 with the queen (1.9% here) — playable, but the queen is misplaced this early.",
                        lineName: "3...Qf6",
                        lineDescription: "Develop naturally and use the d5 square the queen can no longer contest.",
                        variations: line(
                          { san: "Nc3", description: "Black played Qf6, defending e5 but committing the queen far too early. Just develop with Nc3 — the queen will become a target." },
                          { san: "Nge7", description: "Black develops the knight to e7, since f6 is occupied by the queen." },
                          { san: "O-O", description: "Black played Nge7. Castle. Black's pieces are tangled behind the queen and you can build calmly." },
                          { san: "a6", description: "Black kicks the bishop with a6." },
                          { san: "Ba4", description: "Black played a6. Retreat to a4 and keep the bishop." },
                          { san: "b5", description: "Black gains space with b5." },
                          { san: "Bb3", description: "Black played b5. Step back to b3, eyeing f7 and the a2–g8 diagonal." },
                          { san: "d6", description: "Black solidifies with d6." },
                          { san: "Nd5", description: "Black played d6. Nd5! — best by a distance (+2.0, against +1.1 for anything else). It is not an outpost: the e7 knight guards d5 and will take it next move. It is a forcing trade. From d5 the knight attacks the f6 queen, the e7 knight and c7 all at once, and declining costs Black at least three pawns — 8...Qg6 9.Nxc7+ is check with the a8 rook hanging (Black's only replies are Kd7 and Kd8, then Nxa8)." },
                          { san: "Nxd5", description: "Black has to take: every alternative runs -4.7 or worse." },
                          { san: "Bxd5", description: "Black played Nxd5. Recapture with the BISHOP, not the pawn — this is the whole point of the line. Bxd5 keeps +1.8; the natural exd5 collapses to +0.3. Two concrete reasons: the bishop hits f7 as well as c6 (a pawn on d5 only hits c6), and taking with the bishop keeps your pawn on e4, so you still own the centre instead of trading it away." },
                          { san: "Bd7", description: "Black defends the c6 knight with Bd7." },
                          { san: "d4", description: "Black played Bd7. Open the centre with d4 while Black's queen is still awkward on f6 and the king has not castled. About +1.8 with much the freer game." },
                        ),
                      },
                      {
                        san: "f6",
                        description: "Black props up e5 with f6 (0.6%), weakening the king's diagonal to do it.",
                        lineName: "3...f6",
                        lineDescription: "Open the centre immediately — the f6 pawn means Black's king has no shelter.",
                        variations: line(
                          { san: "d4", description: "Black played f6, defending e5 at the cost of the g8–a2 diagonal and the e6 square. Strike at once with d4 before Black can develop." },
                          { san: "exd4", description: "Black captures on d4." },
                          { san: "Nxd4", description: "Black played exd4. Recapture with the knight, hitting the c6 knight." },
                          { san: "Nxd4", description: "Black trades knights on d4." },
                          { san: "Qxd4", description: "Black played Nxd4. Recapture with the queen — centralised, and Black has no ...Nc6 to chase it away." },
                          { san: "c6", description: "Black plays c6 to kick the bishop." },
                          { san: "Bc4", description: "Black played c6. Retreat to c4, straight onto the diagonal that ...f6 weakened, aiming at f7 and e6." },
                          { san: "Ne7", description: "Black develops the knight to e7." },
                          { san: "O-O", description: "Black played Ne7. Castle. Black's king is stuck in the centre behind a hole on e6, and you're about a pawn better with much freer play." },
                        ),
                      },
                      {
                        san: "Bc5",
                        description: "Black plays the Classical (Cordel) Defense — 13% of replies, and the most common line the repertoire had no answer to.",
                        lineName: "Classical Defense (3...Bc5)",
                        lineDescription: "Build the centre with c3 and d4. Black's popular ...Bb4+ is an error, and the odd-looking Kf1! is much the strongest reply.",
                        variations: line(
                          { san: "c3", description: "Black played Bc5, mirroring your bishop. Prepare the big centre with c3 — d4 is coming and the c5 bishop will have to answer for it." },
                          { san: "d6", description: "Black solidifies with d6." },
                          { san: "d4", description: "Black played d6. Now d4, hitting both e5 and the c5 bishop's diagonal." },
                          { san: "exd4", description: "Black captures on d4." },
                          { san: "cxd4", description: "Black played exd4. Recapture with the c-pawn — you now have the ideal e4/d4 duo and the bishop on c5 is attacked." },
                          { san: "Bb4+", description: "Black checks with Bb4+ — played 83% of the time here, and it's a mistake." },
                          { san: "Kf1", description: "Black played Bb4+. Answer with Kf1!! — it looks wrong to give up castling, but it's far and away best (+2.4, against +1.25 for Nc3). Blocking with Nc3 or Bd2 lets Black trade off and equalise; stepping aside keeps the whole centre and leaves the b4 bishop with nothing to do." },
                          { san: "Bd7", description: "Black develops the bishop to d7, defending the pinned knight." },
                          { san: "Qa4", description: "Black played Bd7. Hit the pinned pieces with Qa4, adding a third attacker to the c6 knight." },
                          { san: "a5", description: "Black props up the b4 bishop with a5. You are close to three pawns better: a dominant centre, Black's king stuck and the b4 bishop out of play." },
                        ),
                      },
                      {
                        san: "Nd4",
                        description: "Black plays Bird's Defense, offering a knight trade to break the pin (5% here).",
                        lineName: "Bird's Defense (3...Nd4)",
                        lineDescription: "Trade the knight off, castle, and target the doubled d-pawn Black is left with.",
                        variations: line(
                          { san: "Nxd4", description: "Black played Nd4. Take it — Nxd4 is played 84% of the time and is simply best. Black gets a doubled d-pawn out of the recapture." },
                          { san: "exd4", description: "Black must recapture with the pawn, taking on a doubled, isolated d-pawn." },
                          { san: "O-O", description: "Black played exd4. Castle. No need to rush: the d4 pawn is a permanent weakness and will not run away." },
                          { san: "c6", description: "Black plays c6 to kick your bishop." },
                          { san: "Bc4", description: "Black played c6. Retreat to c4, where the bishop keeps its eye on f7 and the a2–g8 diagonal." },
                          { san: "b5", description: "Black gains space with b5, hitting the bishop again." },
                          { san: "Bb3", description: "Black played b5. Step back to b3 — still on the good diagonal, and Black's queenside pawns are now loose." },
                          { san: "a5", description: "Black keeps pushing with a5." },
                          { san: "a4", description: "Black played a5. Stop the pawns in their tracks with a4! Black's queenside advance has left holes and the d4 pawn is still sitting there." },
                          { san: "b4", description: "Black pushes past with b4. You're clearly better — Black has spent the opening pushing pawns and still owns a weak d4 pawn." },
                        ),
                      },
                      {
                        san: "Nf6",
                        description: "Black plays the Berlin Defense, counter-attacking e4. 16% of replies to the Ruy López.",
                        variations: [
                          {
                            san: "O-O",
                            description: "Black attacked your e4 pawn with Nf6. Ignore the threat and castle (O-O) to safety — the pawn is not really free.",
                            variations: [
                              {
                                san: "Nxe4",
                                description: "Black grabs the e4 pawn (26% here).",
                                lineName: "Berlin Defense",
                                lineDescription: "The solid Berlin Defense",
                                variations: line(
                                  { san: "d4", description: "Black took the pawn! Strike back in the center with d4 to open the e-file." },
                                  { san: "Nd6", description: "Black retreats the knight to d6, attacking your bishop." },
                                  { san: "Bxc6", description: "Black attacked your bishop. Capture their knight with Bxc6." },
                                  { san: "dxc6", description: "Black recaptures with their d-pawn." },
                                ),
                              },
                              {
                                san: "d6",
                                description: "Black plays the solid d6, propping up e5 rather than grabbing on e4. Equal-most-common here at 27%.",
                                lineName: "Berlin: 4...d6",
                                lineDescription: "Open the centre with d4 at once — both the engine's choice and White's best-scoring practical try (55%).",
                                variations: line(
                                  { san: "d4", description: "Black played d6. Strike with d4 immediately — best by eval and by results (55% for White), ahead of the more popular Re1." },
                                  { san: "exd4", description: "Black captures on d4." },
                                  { san: "Qxd4", description: "Black played exd4. Recapture with the queen — it stands well in the centre because the b5 bishop stops ...Nc6 hitting it with tempo." },
                                  { san: "Bd7", description: "Black develops the bishop to d7, unpinning the knight." },
                                  { san: "Bxc6", description: "Black played Bd7. Trade on c6 now — it damages Black's structure while the bishop is committed." },
                                  { san: "Bxc6", description: "Black recaptures with the bishop." },
                                  { san: "Re1", description: "Black played Bxc6. Bring the rook to e1, lining up on the e-file where Black's king still sits." },
                                  { san: "Be7", description: "Black develops the bishop and prepares to castle." },
                                  { san: "e5", description: "Black played Be7. Push e5! It gains space and hits the f6 knight before Black can consolidate." },
                                  { san: "dxe5", description: "Black played dxe5. You have the freer game and pressure down the e-file." },
                                ),
                              },
                              {
                                san: "Bc5",
                                description: "Black develops actively with Bc5 (26% here) — but it leaves e5 defended only by the knight.",
                                lineName: "Berlin: 4...Bc5",
                                lineDescription: "Nxe5! exploits the loose e5 pawn. Black recaptures naturally 65% of the time and comes out clearly worse.",
                                variations: line(
                                  { san: "Nxe5", description: "Black played Bc5. Take on e5! The point is that after Nxe5 your d-pawn comes to d4 hitting both the c5 bishop and the e5 knight. Black's best is 5...Nxe4 (about +0.5); the natural recapture is much worse." },
                                  { san: "Nxe5", description: "Black recaptures the knight — played 65% of the time, and the move you want to see." },
                                  { san: "d4", description: "Black played Nxe5. Now d4! — the double attack on the bishop and knight is the whole idea." },
                                  { san: "Bxd4", description: "Black takes on d4 with the bishop." },
                                  { san: "Qxd4", description: "Black played Bxd4. Recapture with the queen, now centralised and hitting the e5 knight." },
                                  { san: "Nc6", description: "Black's knight retreats to c6, attacked by the queen." },
                                  { san: "Bxc6", description: "Black played Nc6. Trade on c6 to wreck the queenside pawns." },
                                  { san: "bxc6", description: "Black recaptures with the b-pawn, accepting doubled pawns." },
                                  { san: "Bg5", description: "Black played bxc6. Develop with Bg5, pinning the f6 knight against the queen." },
                                  { san: "O-O", description: "Black castles. You have the better structure, the bishop pair pressure and a big lead — about +3." },
                                ),
                              },
                              {
                                san: "Ng4",
                                description: "Black tries the Fishing Pole with Ng4, hoping you grab the knight after ...h5.",
                                lineName: "Berlin: Fishing Pole Declined",
                                lineDescription: "Sidestep it. Never play hxg4 after ...h5 — that is the trap, and Black scores 90% when White takes.",
                                variations: line(
                                  { san: "c3", description: "Black played Ng4, inviting h3 and then the ...h5!! bait. Decline the whole thing with c3, preparing d4. If you do play h3 and Black answers h5, the one move you must avoid is hxg4 — it loses to ...hxg4 and mate on h1; Black scores 90% from there." },
                                  { san: "Bc5", description: "Black develops the bishop to c5." },
                                  { san: "d4", description: "Black played Bc5. Build the centre with d4 as prepared." },
                                  { san: "exd4", description: "Black captures on d4." },
                                  { san: "cxd4", description: "Black played exd4. Recapture with the c-pawn for a strong pawn duo." },
                                  { san: "Bb6", description: "Black retreats the bishop to b6." },
                                  { san: "Nc3", description: "Black played Bb6. Develop Nc3. The g4 knight has achieved nothing, you own the centre, and Black's kingside plan never got going." },
                                ),
                              },
                              {
                                san: "a6",
                                description: "Black plays a6, kicking the bishop before deciding anything else (9% here).",
                                lineName: "Berlin: 4...a6",
                                lineDescription: "Trade on c6 first. That removes e5's only defender, and Nxe5 then wins a clean pawn.",
                                variations: line(
                                  { san: "Bxc6", description: "Black played a6. Take on c6 straight away! It looks like conceding the bishop pair, but it strips e5 of its defender: after ...dxc6 the d-pawn is gone from d6 and nothing guards e5." },
                                  { san: "dxc6", description: "Black recaptures with the d-pawn (81% here), doubling the c-pawns." },
                                  { san: "Nxe5", description: "Black played dxc6. Now Nxe5 is simply a free pawn — e5 has one attacker and zero defenders. The engine has this at +1.3 against +0.2 for anything quiet." },
                                  { san: "Bd6", description: "Black develops the bishop to d6, hitting your knight." },
                                  { san: "Nf3", description: "Black played Bd6. Retreat the knight to f3 — no need to hold e5, you already banked the pawn." },
                                  { san: "Bg4", description: "Black pins the knight with Bg4." },
                                  { san: "e5", description: "Black played Bg4. Push e5! It hits the d6 bishop and breaks the pin's point in one move." },
                                  { san: "Bxe5", description: "Black takes the pawn with the bishop." },
                                  { san: "Re1", description: "Black played Bxe5. Bring the rook to e1, pinning the bishop against the king on the open file — it has no legal moves, is attacked twice and defended by nothing, so it simply falls. Material is even for one more move; once you collect the bishop you are winning (+3.3)." },
                                ),
                              },
                              {
                                san: "Be7",
                                description: "Black develops quietly with Be7 (5% here), heading for a normal Closed structure.",
                                lineName: "Berlin: 4...Be7",
                                lineDescription: "Nothing dramatic — take the centre, play the standard c3/Ba4/Bc2 regrouping and enjoy a small edge.",
                                variations: line(
                                  { san: "Re1", description: "Black played Be7. Bring the rook to e1, defending e4 so the knight is free to move later." },
                                  { san: "d6", description: "Black props up e5 with d6." },
                                  { san: "h3", description: "Black played d6. Play h3 — a useful waiting move that permanently denies Black's pieces the g4 square before you commit the centre." },
                                  { san: "O-O", description: "Black castles." },
                                  { san: "c3", description: "Black castled. Play c3, supporting a future d4 and opening the b3 retreat for the bishop." },
                                  { san: "a6", description: "Black kicks the bishop with a6." },
                                  { san: "Ba4", description: "Black played a6. Retreat to a4, keeping the bishop on the diagonal rather than trading it." },
                                  { san: "b5", description: "Black gains space with b5." },
                                  { san: "Bc2", description: "Black played b5. Tuck the bishop into c2 — the classic Ruy López regrouping, aiming at h7." },
                                  { san: "Bb7", description: "Black fianchettoes to b7. A standard Closed Ruy López where you hold a small, safe edge." },
                                ),
                              },
                            ],
                          },
                        ],
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
                                san: "b5",
                                description: "Black pushes b5 immediately — 22% here, and the second-most-common reply after Nf6.",
                                lineName: "4...b5 (Early Queenside)",
                                lineDescription: "Black spends time on pawns instead of pieces. Take the centre with d4 and the e5 push punishes the lag in development.",
                                variations: line(
                                  { san: "Bb3", description: "Black played b5, gaining space but not developing. Retreat to b3 — forced, and the bishop is happy there." },
                                  { san: "Nf6", description: "Black finally develops the knight to f6." },
                                  { san: "O-O", description: "Black played Nf6. Castle, keeping the e4 pawn defended by the rook once Re1 follows." },
                                  { san: "Be7", description: "Black develops the bishop and prepares to castle." },
                                  { san: "d4", description: "Black played Be7. Strike with d4! Black has spent two moves on queenside pawns, so opening the centre now catches the king still in it." },
                                  { san: "exd4", description: "Black captures on d4." },
                                  { san: "e5", description: "Black played exd4. Push e5! — don't recapture yet. The pawn hits the f6 knight and gains a tempo while Black's pieces are tangled." },
                                  { san: "Ng4", description: "Black's knight jumps to g4, the only square that keeps it active." },
                                  { san: "Bd5", description: "Black played Ng4. Bd5! — the bishop lands on a dominant central square, hitting a8 and f7 at once. You're about a pawn and a half better." },
                                ),
                              },
                              {
                                san: "d6",
                                description: "Black plays the Modern Steinitz with d6, propping up e5 before developing. Played in 8% of games here.",
                                variations: [
                                  {
                                    san: "Nc3",
                                    description: "Black played d6. Develop Nc3. It isn't the main move here (5.O-O and 5.c3 are far more common) but it's just as good — about +0.4 either way — and it aims a piece at the d5 square, which turns out to matter.",
                                    variations: [
                                      {
                                        san: "b5",
                                        description: "Black gains queenside space with b5, hitting your bishop.",
                                        variations: [
                                          {
                                            san: "Bb3",
                                            description: "Black played b5. Retreat to b3, where the bishop keeps its aim at f7 — the square the whole trap runs through.",
                                            variations: [
                                              {
                                                san: "Bg4",
                                                description: "Black pins your knight to the queen with Bg4 (16.9%). This is the mistake — and the one you're hoping for.",
                                                lineName: "Modern Steinitz: Legall's Mate",
                                                lineDescription: "Black's ...Bg4 pin is an illusion. Nxe5! wins material outright — or mates when Black grabs the queen, which happens more than half the time.",
                                                variations: line(
                                                  { san: "h3", description: "Black pinned your f3 knight. Ask the question with h3 — the bishop must decide whether to take or hold the pin." },
                                                  { san: "Bh5", description: "Black keeps the pin with Bh5, the natural choice (78% play it). The bishop is now on the d1–h5 diagonal, and your knight is the only thing standing on it." },
                                                  { san: "Nxe5", description: "Black played Bh5. Now the point: Nxe5! Moving the knight uncovers your queen's attack on the h5 bishop, so this is NOT a real sacrifice. If Black declines with 8...Nxe5, you simply play 9.Qxh5 and win the piece straight back — still about +2.3. Black grabs the queen anyway more than half the time." },
                                                  { san: "Bxd1", description: "Black takes the queen — the greedy move, played 54% of the time from here." },
                                                  { san: "Bxf7+", description: "Black took your queen. Bxf7+! Check — and Black has exactly one legal reply." },
                                                  { san: "Ke7", description: "Black's king is forced to e7; every other square is covered." },
                                                  { san: "Nd5#", description: "Black played Ke7, the only move. Nd5 is checkmate! The knight covers the escape squares, your f7 bishop and e5 knight seal the rest, and Black's extra queen sits uselessly on d1. This is Legall's Mate — the reason Nc3 went to that square on move five." },
                                                ),
                                              },
                                              {
                                                san: "Nf6",
                                                description: "Black develops Nf6 — the most common reply here (22.2%), hitting your e4 pawn.",
                                                lineName: "Modern Steinitz: 6...Nf6",
                                                lineDescription: "Black's most popular try. Ng5! hits f7 at once and gives White the biggest edge of any line in this branch.",
                                                variations: line(
                                                  { san: "Ng5", description: "Black played Nf6, attacking e4. Ignore it — Ng5! The knight and the b3 bishop both bear down on f7, and this is clearly White's best (+0.7, well ahead of the alternatives)." },
                                                  { san: "d5", description: "Black blocks the diagonal and counters in the centre with d5." },
                                                  { san: "Nxd5", description: "Black played d5. Take with the knight — Nxd5, not exd5. The knight lands on a dominant central square and keeps the pressure on f6 and e7." },
                                                  { san: "Nd4", description: "Black centralises with Nd4, hitting your b3 bishop." },
                                                  { san: "Ne3", description: "Black played Nd4, forking bishop and c2. Retreat the d5 knight to e3, where it defends c2 and holds the strong square." },
                                                  { san: "Nxb3", description: "Black trades off your good bishop with Nxb3." },
                                                  { san: "axb3", description: "Black took on b3. Recapture with the a-pawn — axb3 opens the a-file for your rook and rebuilds a solid pawn mass. You're comfortably better." },
                                                ),
                                              },
                                              {
                                                san: "Na5",
                                                description: "Black plays Na5 (18.8%), aiming to trade off your strong light-squared bishop.",
                                                lineName: "Modern Steinitz: 6...Na5",
                                                lineDescription: "Black chases the bishop; open the centre with d4 before the knight on a5 can come back into the game.",
                                                variations: line(
                                                  { san: "d4", description: "Black played Na5, offering to trade your bishop. Strike in the centre first with d4! The knight on a5 is offside, so opening the position favours you." },
                                                  { san: "exd4", description: "Black captures on d4." },
                                                  { san: "Qxd4", description: "Black played exd4. Recapture with the queen — Qxd4 centralises safely because ...Nc6 would hang the a5 knight's retreat square." },
                                                  { san: "Ne7", description: "Black develops the knight to e7, heading for g6." },
                                                  { san: "Qd3", description: "Black played Ne7. Tuck the queen back to d3 — safe, active, and eyeing the queenside where Black's pawns are loose." },
                                                  { san: "Bb7", description: "Black fianchettoes the bishop to b7." },
                                                  { san: "O-O", description: "Black played Bb7. Castle. You have the centre, easier development, and Black's a5 knight still has no good square." },
                                                ),
                                              },
                                              {
                                                san: "Be6",
                                                description: "Black offers a trade with Be6 (12.4%), challenging your best piece.",
                                                lineName: "Modern Steinitz: 6...Be6",
                                                lineDescription: "A pawn sacrifice, not a pawn win: the d5 pawn is doomed, but Black spends four moves collecting it and you get d4 and the initiative instead.",
                                                variations: line(
                                                  { san: "Bd5", description: "Black played Be6, offering a trade. Take the initiative with Bd5! — forcing the trade on the square you want rather than letting Black capture on b3." },
                                                  { san: "Bxd5", description: "Black trades on d5." },
                                                  { san: "exd5", description: "Black played Bxd5. Recapture with the e-pawn, gaining a tempo on the c6 knight. Note this pawn is not a spare one — material is dead level, and the d5 pawn is a long-term liability you are trading for time." },
                                                  { san: "Nce7", description: "Black's knight retreats to e7, kicked by your pawn — and now attacks d5." },
                                                  { san: "O-O", description: "Black played Nce7. Castle. The d5 pawn cannot be held forever, so don't try; get developed while Black spends moves winning it." },
                                                  { san: "Nf6", description: "Black develops the other knight to f6, hitting d5 a second time." },
                                                  { san: "Re1", description: "Black played Nf6. Bring the rook to e1. Grabbing now with 10...Nfxd5?? is bad for Black — 11.Nxd5 Nxd5 12.d4! rips open the centre with the black king still on e8, and you are a full pawn better (+1.0)." },
                                                  { san: "b4", description: "Black finds the right move order: kick the knight first with b4, so that taking on d5 will come with tempo." },
                                                  { san: "Ne4", description: "Black played b4. Jump to e4 — the knight is loose on c3, and e4 is the square that keeps it active." },
                                                  { san: "Nxe4", description: "Black trades on e4." },
                                                  { san: "Rxe4", description: "Black played Nxe4. Recapture with the rook. It sits actively on the fourth rank and eyes both the e-file and the queenside." },
                                                  { san: "f5", description: "Black gains a tempo on your rook with f5 — but weakens the a2–g8 diagonal and the e6 square doing it." },
                                                  { san: "Re1", description: "Black played f5. Step back to e1. The rook stays on the open file and Black's kingside pawns are now committed." },
                                                  { san: "Nxd5", description: "Black finally collects the d5 pawn and is a pawn up on the scoreboard." },
                                                  { san: "d4", description: "Black played Nxd5, going a pawn up. Now d4! — this is the point of the whole line. The centre opens while Black's king is still on e8, the f5 pawn has weakened e6 and g6, and your rook and queen get open lines. Stockfish rates this around +0.3 for White despite the missing pawn: full compensation, not equality by accident." },
                                                ),
                                              },
                                              {
                                                san: "Be7",
                                                description: "Black plays the solid Be7 — the engine's pick, though only 4.6% of players find it.",
                                                lineName: "Modern Steinitz: 6...Be7",
                                                lineDescription: "Black's soundest reply. Undermine the queenside with a4 before Black consolidates.",
                                                variations: line(
                                                  { san: "a4", description: "Black played Be7, objectively the best move here. Hit the overextended queenside at once with a4 — Black's b5/a6 pawn chain is the only thing loose in the position." },
                                                  { san: "b4", description: "Black pushes past with b4, kicking your knight." },
                                                  { san: "Nd5", description: "Black played b4. Jump into d5! The pawn on b4 no longer controls it, and the knight dominates from there." },
                                                  { san: "Nf6", description: "Black challenges the knight with Nf6." },
                                                  { san: "d4", description: "Black played Nf6. Now take the centre with d4 while your knight holds d5. The e4 pawn really is hanging — Nc3 left the square when it jumped to d5 — but taking it costs Black: 9...Nxe4 10.Qd3! and the knight has no defender, so Black must spend a move propping it up. 10...f5 is the best try (about +1.9 for White) but it wrecks the kingside. If instead 10...Nf6, play 11.Qc4! hitting f7 (+3.5) — do NOT trade with 11.Nxf6+, which is only +0.6 because Black just recaptures with the e7 bishop. Retreats that simply drop the piece are ...Ng3 to hxg3, ...Nd2 to Bxd2, ...Nc3 to bxc3, and ...Nc5 to the d4 pawn." },
                                                  { san: "Na5", description: "Black declines the e4 pawn and plays Na5, going after your bishop instead — this is Black's best (-0.46)." },
                                                  { san: "Ba2", description: "Black played Na5. Slide the bishop to a2 — it stays on the a2–g8 diagonal, out of reach, and keeps eyeing f7. A small but pleasant edge." },
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
                                                    variations: [
                                                      {
                                                        san: "d6",
                                                        description: "Black plays a solid d6 — 34% here.",
                                                        lineName: "Closed Defense",
                                                        lineDescription: "The main line with a6 and b5",
                                                        variations: [],
                                                      },
                                                      {
                                                        san: "O-O",
                                                        description: "Black castles — the main move at 65%, and the gateway to the Marshall Attack.",
                                                        lineName: "Closed: Anti-Marshall (8.h3)",
                                                        lineDescription: "Sidestep the Marshall with h3. The engine slightly prefers 8.c3, but that invites 8...d5 and White scores only 44% against it — h3 scores 52%.",
                                                        variations: line(
                                                          { san: "h3", description: "Black castled. Play h3! The engine marginally prefers 8.c3 (+0.36 against +0.29), but 8.c3 invites the Marshall Attack with 8...d5 — played 67% of the time — and White scores just 44% there against Black's 54%. h3 and a4 both score 52%. Seven hundredths of a pawn is worth trading for eight points of results." },
                                                          { san: "d6", description: "Black plays d6, transposing back into a normal Closed structure — exactly what h3 was for." },
                                                          { san: "c3", description: "Black played d6. Now c3 is safe, because ...d5 no longer comes with the Marshall's tempo." },
                                                          { san: "Na5", description: "Black plays Na5, going after your bishop." },
                                                          { san: "Bc2", description: "Black played Na5. Tuck the bishop into c2 — it keeps the b1–h7 diagonal and stays out of reach." },
                                                          { san: "c5", description: "Black takes queenside space with c5. A balanced Closed Ruy López where you have the extra tempo of h3 in hand." },
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
              {
                san: "d6",
                description: "Black plays the Philidor Defense (16% of replies to 2.Nf3) — solid but passive, propping up e5 with the d-pawn.",
                lineName: "Philidor Defense (2...d6)",
                lineDescription: "Open with d4 and offer the c3 gambit: accepted 61% of the time, and the attack against f7/e6 is worth far more than the pawn (+2.3).",
                variations: line(
                  { san: "d4", description: "Black played the Philidor d6. Open the centre with d4 at once — d6 blocked Black's dark-squared bishop, so opening lines favours you." },
                  { san: "exd4", description: "Black captures on d4 (62% here)." },
                  { san: "c3", description: "Black played exd4. Offer the pawn back with c3!? — a Danish-style gambit against the Philidor. Black accepts 61% of the time, and development is worth more than the pawn here." },
                  { san: "dxc3", description: "Black takes the second pawn with dxc3." },
                  { san: "Bc4", description: "Black played dxc3. Develop Bc4 with tempo toward f7, ignoring the c3 pawn for now." },
                  { san: "Be6", description: "Black blocks the diagonal with Be6, the most common try." },
                  { san: "Bxe6", description: "Black played Be6. Trade — Bxe6 saddles Black with a weak, doubled e-pawn complex in front of the king." },
                  { san: "fxe6", description: "Black recaptures with the f-pawn." },
                  { san: "Qb3", description: "Black played fxe6. Qb3! — the queen hits b7 and the freshly weakened e6 pawn at the same time." },
                  { san: "Qc8", description: "Black defends both targets with the awkward Qc8." },
                  { san: "Ng5", description: "Black played Qc8. Pile on e6 with Ng5 — Black's pieces are all tangled defending it." },
                  { san: "Ke7", description: "Black's king has to step up to e7 to hold e6 together." },
                  { san: "Nxc3", description: "Black played Ke7. Collect the gambit pawn back with Nxc3. Count the position: you are still a pawn down, but Black's king is stuck on e7 in the middlegame — +2.3 all the same." },
                ),
              },
              {
                san: "Nf6",
                description: "Black plays the Petrov (11% here) — the same defense you play as Black, so you know its ideas from the other side.",
                lineName: "Petrov as White (3.d4)",
                lineDescription: "The Modern Attack: 3.d4 opens the game before Black's symmetric setup settles. Ends +1.5.",
                variations: line(
                  { san: "d4", description: "Black played the Petrov Nf6. Answer with the Modern Attack d4 — you play this position as Black, so you know 3.Nxe5 leads where Black wants; d4 asks harder questions." },
                  { san: "exd4", description: "Black captures on d4 (44% here)." },
                  { san: "e5", description: "Black played exd4. Push e5, kicking the f6 knight before Black consolidates." },
                  { san: "Nd5", description: "Black centralises the knight on d5." },
                  { san: "Qxd4", description: "Black played Nd5. Recapture with Qxd4 — the queen sits safely in the centre because Black's knight blocks its own ...c6-...Nc6 tempo tricks." },
                  { san: "c6", description: "Black shores up the d5 knight with c6." },
                  { san: "Bd3", description: "Black played c6. Develop Bd3, pointing at h7 and preparing to castle." },
                  { san: "Be7", description: "Black develops the bishop to e7." },
                  { san: "O-O", description: "Black played Be7. Castle. You have extra space, the freer game and a straightforward attacking plan — about +1.5." },
                ),
              },
            ],
          },
        ],
      },
    ],
  },
];

/** Anti-Scandinavian as its own opening: 1.e4 with Black's 1...d5 reply. */
const antiScandinavianTree: TreeMove[] = [
  {
    san: "e4",
    description: "Open with e4.",
    variations: [antiScandinavianBranch],
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
                    san: "Bb5+",
                    description: "White gives the Moscow check with Bb5+ — another way of dodging the Open Sicilian. You need a ready answer here too.",
                    lineName: "Moscow (3.Bb5+)",
                    lineDescription: "Block with the bishop, recapture with the queen, and play a solid, comfortable game.",
                    variations: line(
                      { san: "Bd7", description: "White checked with Bb5+. Block with Bd7 — the cleanest reply. Blocking with ...Nd7 or ...Nc6 leaves your pieces more tangled." },
                      { san: "Bxd7+", description: "White trades on d7." },
                      { san: "Qxd7", description: "White played Bxd7+. Recapture with the queen! It's more active than ...Nxd7 and keeps the b8 knight free to develop to c6." },
                      { san: "O-O", description: "White castles kingside." },
                      { san: "Nf6", description: "White castled. Develop Nf6, hitting the e4 pawn and getting ready to castle yourself." },
                      { san: "Re1", description: "White supports e4 with the rook." },
                      { san: "Nc6", description: "White played Re1. Develop the last knight to c6, where it controls d4 and eyes the queenside." },
                      { san: "c3", description: "White plays c3, preparing d4." },
                      { san: "e6", description: "White played c3. Play e6 — a solid setup that blunts the d4 push and prepares ...Be7 and castling. Light-squared bishops are off, so your remaining pieces have easy squares." },
                    ),
                  },
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
                variations: [
                  {
                    san: "d4",
                    description: "White opens the center with d4, entering the Open Sicilian.",
                    lineName: "Sveshnikov Variation",
                    lineDescription: "The dynamic Sveshnikov / Lasker-Pelikan",
                    variations: line(
                      { san: "cxd4", description: "White played d4. Exchange pawns with cxd4." },
                      { san: "Nxd4", description: "White recaptures with the knight." },
                      { san: "Nf6", description: "White recaptured. Develop to f6, attacking e4." },
                      { san: "Nc3", description: "White defends e4 with Nc3." },
                      { san: "e5", description: "White defended e4. Strike the center with e5, the defining Sveshnikov move — accepting a backward d-pawn for huge piece activity." },
                      { san: "Ndb5", description: "White jumps the knight to b5, eyeing d6." },
                      { san: "d6", description: "White attacked d6. Defend with d6 — the standard Sveshnikov main line." },
                    ),
                  },
                  {
                    san: "Bb5",
                    description: "White plays the Rossolimo — declining the Open Sicilian entirely. This is 13% of games after 2...Nc6, so you need an answer or you're out of book on move three.",
                    lineName: "Rossolimo (3.Bb5)",
                    lineDescription: "White ducks the Open Sicilian. Take the bishop pair, recapture toward the centre, and set up ...e5.",
                    variations: line(
                      { san: "g6", description: "White played Bb5, pinning nothing but threatening to double your pawns. Fianchetto with g6 — the bishop belongs on the long diagonal and you're happy to let White trade on c6." },
                      { san: "Bxc6", description: "White trades on c6, doubling your pawns." },
                      { san: "dxc6", description: "White played Bxc6. Recapture with the d-pawn! Not bxc6 — dxc6 opens the d-file for your queen, frees the c8 bishop, and gives you the bishop pair as compensation for the doubled pawns." },
                      { san: "O-O", description: "White castles." },
                      { san: "Bg7", description: "White castled. Complete the fianchetto with Bg7; your bishop pair is the long-term trump in an open position." },
                      { san: "d3", description: "White plays d3, keeping the position closed." },
                      { san: "Qc7", description: "White played d3. Develop the queen to c7 — it supports the ...e5 push and eyes the half-open c-file." },
                      { san: "Nc3", description: "White develops the knight to c3." },
                      { san: "e5", description: "White played Nc3. Clamp the centre with e5! You have the bishop pair and a solid structure; the doubled c-pawns actually help you control d4." },
                    ),
                  },
                ],
              },
            ],
          },
          {
            san: "Nc3",
            description: "White plays the Closed Sicilian with Nc3 — no d4 push at all, just a slow kingside build-up. Played 8.6% of the time.",
            lineName: "Closed Sicilian (2.Nc3)",
            lineDescription: "White goes for a slow kingside attack; you seize space and plant a knight on d4.",
            variations: line(
              { san: "Nc6", description: "White played Nc3, declining to open the centre. Develop Nc6 naturally — in a slow position you can afford normal moves." },
              { san: "f4", description: "White plays f4, the Grand Prix setup, aiming for a kingside attack." },
              { san: "g6", description: "White played f4 with attacking intentions. Fianchetto with g6! The bishop on g7 is your best defensive and counter-attacking piece against this setup." },
              { san: "Nf3", description: "White develops the knight to f3." },
              { san: "Bg7", description: "White played Nf3. Complete the fianchetto with Bg7, pointing straight at White's queenside." },
              { san: "Bb5", description: "White pins with Bb5, hoping to trade off your c6 knight." },
              { san: "Nd4", description: "White played Bb5. Jump in with Nd4! — a beautiful central outpost that hits the bishop and dares White to trade into a comfortable structure for you." },
              { san: "O-O", description: "White castles kingside." },
              { san: "e6", description: "White castled. Play e6, giving the d4 knight permanent support and preparing ...Ne7. You're comfortable here — statistically Black scores well against the Closed." },
            ),
          },
          {
            san: "f4",
            description: "White launches straight into the Grand Prix Attack with f4, planning a fast kingside assault. Played 5.7% of the time.",
            lineName: "Grand Prix Attack (2.f4)",
            lineDescription: "Strike in the centre with ...d5 immediately — the most testing answer to White's flank attack.",
            variations: line(
              { san: "d5", description: "White played f4, committing to a kingside attack but weakening the centre and the a7–g1 diagonal. Hit back at once with d5! A flank attack is met by a central counter." },
              { san: "e5", description: "White pushes past with e5, keeping the centre closed." },
              { san: "Nc6", description: "White played e5. Develop Nc6, immediately pressuring the d4 square and the e5 pawn's future support." },
              { san: "Nf3", description: "White develops the knight to f3." },
              { san: "Bg4", description: "White played Nf3. Pin the knight with Bg4! Getting this bishop outside the pawn chain before ...e6 is the key move — otherwise it becomes a bad bishop." },
              { san: "Be2", description: "White breaks the pin by offering a trade with Be2." },
              { san: "e6", description: "White played Be2. Now play e6, building a solid chain. Your bishop is already outside it, so you have none of the usual French problems." },
              { san: "O-O", description: "White castles kingside." },
              { san: "Nh6", description: "White castled. Develop the knight via h6! It looks odd, but the knight heads for f5 where it blockades White's attack and eyes d4 — Black scores 57% from here." },
            ),
          },
          {
            san: "Bc4",
            description: "White develops the bishop straight to c4, eyeing f7 before committing the centre. Played 8.5% — and it's White's worst-scoring try, with Black scoring 51%.",
            lineName: "2.Bc4",
            lineDescription: "Blunt the bishop with ...e6 and hit back with ...d5 for a comfortable game.",
            variations: line(
              { san: "e6", description: "White played Bc4, aiming at f7. Answer with e6! — it blocks the bishop's diagonal at once and prepares the freeing ...d5 break." },
              { san: "Nc3", description: "White develops the knight to c3." },
              { san: "Nf6", description: "White played Nc3. Develop Nf6, attacking e4 and gaining time." },
              { san: "d3", description: "White defends e4 with d3, admitting the bishop is misplaced." },
              { san: "d5", description: "White played d3. Strike with d5! You gain the centre with tempo and White's bishop has to move again." },
              { san: "exd5", description: "White captures on d5." },
              { san: "exd5", description: "White played exd5. Recapture with the e-pawn, opening the e-file and freeing your light-squared bishop." },
              { san: "Bb3", description: "White retreats the bishop to b3." },
              { san: "Nc6", description: "White played Bb3. Complete development with Nc6. You have a free game, an extra centre pawn's worth of space, and easy piece play." },
            ),
          },
          {
            san: "d4",
            description: "White offers the Smith-Morra Gambit, sacrificing a pawn for a big lead in development. Played 7.4% of the time.",
            lineName: "Smith-Morra Declined",
            lineDescription: "Declining with ...Nf6 sidesteps White's entire prepared attack — accepting the pawn is what the gambiteer wants.",
            variations: line(
              { san: "cxd4", description: "White played d4. Take the pawn — for now." },
              { san: "c3", description: "White offers the second pawn with c3, the Smith-Morra Gambit proper." },
              { san: "Nf6", description: "White offered the gambit pawn. Decline it with Nf6! Taking with ...dxc3 walks into the open lines and rapid development that Morra players live for; ...Nf6 hits e4 and takes them out of their preparation immediately." },
              { san: "e5", description: "White pushes e5 to kick your knight." },
              { san: "Nd5", description: "White played e5. Hop to d5 — a strong central square where the knight can't easily be dislodged." },
              { san: "cxd4", description: "White finally recaptures on d4." },
              { san: "d6", description: "White played cxd4. Undermine the e5 pawn with d6, challenging White's centre before it gets comfortable." },
              { san: "Nf3", description: "White develops the knight to f3." },
              { san: "Nc6", description: "White played Nf3. Develop Nc6, adding another attacker to d4 and e5." },
              { san: "Bc4", description: "White develops the bishop to c4, eyeing f7." },
              { san: "e6", description: "White played Bc4. Solidify with e6, blunting the bishop. Material is level and White has none of the gambit attack they were hoping for." },
            ),
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
                                                description: "White played Be2. Strike at the heart of the center with e5 — the defining King's Indian break, challenging d4 head-on. It looks like you are just dropping the pawn: d4 and Nf3 both hit e5 and only d6 defends it, because your own Nf6 is standing on the g7 bishop's diagonal. Take it anyway. If White grabs with dxe5 dxe5 Nxe5, two things happen at once — the d-file has opened, so ...Qxd1+ comes with check, and ...Nxe4 steps the knight off f6 so the g7 bishop suddenly attacks the e5 knight. Black wins everything back (about +0.6, exactly where White started), which is why dxe5 is not even among the engine's top three moves here.",
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
                                                      { san: "Nd2", description: "White repositions the knight to d2 — natural-looking, but it drops the grip on d4 and hands you the initiative." },
                                                      { san: "exd4", description: "White played Nd2, releasing the d4 tension. Strike at once with exd4! Completing the knight maneuver with ...Nf7 here is far too slow and throws the advantage away." },
                                                      { san: "Nd5", description: "White jumps into d5, hitting c7." },
                                                      { san: "a5", description: "White played Nd5. Play a5, securing c5 for your pieces and stopping b4. You're clearly better (about +1.8) with the extra central pawn and the bishop pair." },
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
          {
            san: "Nf3",
            description: "White develops with Nf3 first — 19% of games, and it usually just transposes.",
            lineName: "vs 2.Nf3 (KID by transposition)",
            lineDescription: "Play your normal King's Indian moves. If White ever plays c4 you land in the exact Classical tabiya you already train; if not, your setup is still fine.",
            variations: line(
              { san: "g6", description: "White played Nf3. Fianchetto with g6 exactly as in your King's Indian — the setup does not care about White's move order." },
              { san: "c4", description: "White takes the centre with c4 after all." },
              { san: "Bg7", description: "White played c4. Continue with Bg7 — you are now walking straight back into your King's Indian." },
              { san: "Nc3", description: "White develops the knight to c3." },
              { san: "O-O", description: "White played Nc3. Castle, as always in the KID." },
              { san: "e4", description: "White builds the full centre with e4." },
              { san: "d6", description: "White played e4. Play d6 — this is now move for move the same position as your Classical King's Indian tabiya (verified identical), so everything you drill there applies from here on." },
            ),
          },
          {
            san: "Bf4",
            description: "White plays the London System — 15% of games, and the most popular sideline at club level.",
            lineName: "vs the London (2.Bf4)",
            lineDescription: "The c5/Qb6/Nd5 counter-recipe: hit d4 and b2 before White finishes the setup. Ends +0.9 for you.",
            variations: line(
              { san: "c5", description: "White played the London Bf4. Strike at d4 immediately with c5 — the London wants a slow, comfortable setup, so deny it one." },
              { san: "e3", description: "White supports d4 with e3, the standard London move (55% here)." },
              { san: "Nd5", description: "White played e3. Jump Nd5!, hitting the f4 bishop before it can settle." },
              { san: "Bg3", description: "White retreats the bishop to g3 — the near-universal reply (87%)." },
              { san: "Qb6", description: "White played Bg3. Now Qb6, aiming at b2 while White's queenside is still asleep." },
              { san: "b3", description: "White defends the queenside with b3, the most common answer." },
              { san: "cxd4", description: "White played b3. Trade with cxd4 to fix White's centre before the next blow." },
              { san: "exd4", description: "White recaptures with the e-pawn." },
              { san: "e5", description: "White played exd4. Strike with e5! — hitting d4 while White's pieces are tangled on the queenside." },
              { san: "Bxe5", description: "White grabs the pawn with the bishop (46% here)." },
              { san: "Bb4+", description: "White played Bxe5. Check with Bb4+! After White blocks, ...d6 and ...Qxd4 regain the pawn with the better game — about +0.9 for you." },
            ),
          },
          {
            san: "Nc3",
            description: "White plays 2.Nc3 (7%), often heading for a Jobava or Veresov setup.",
            lineName: "vs 2.Nc3",
            lineDescription: "Close the centre with c5/d6/e5 — a Czech-Benoni structure. The engine mildly prefers White (about -1.2) but the closed position is easy to play and scores evenly in practice.",
            variations: line(
              { san: "c5", description: "White played Nc3. Answer c5 — with the knight blocking White's own c-pawn, hitting d4 is extra effective." },
              { san: "d5", description: "White pushes past with d5, closing the centre." },
              { san: "e5", description: "White played d5. Stake out your share with e5, building the Czech-Benoni wall." },
              { san: "e4", description: "White takes the full centre with e4." },
              { san: "d6", description: "White played e4. Complete the pawn chain with d6." },
              { san: "Nf3", description: "White develops the knight to f3." },
              { san: "Nbd7", description: "White played Nf3. Develop Nbd7, keeping the c8 bishop's diagonal open for later." },
              { san: "Be2", description: "White develops the bishop to e2." },
              { san: "Be7", description: "White played Be2. Develop Be7 and prepare to castle." },
              { san: "O-O", description: "White castles." },
              { san: "O-O", description: "White castled. Castle too. The centre is locked, so play continues on the wings — engine says about -1.2, but this structure scores roughly 50% in practice and there is nothing sharp to memorise." },
            ),
          },
          {
            san: "e3",
            description: "White plays the modest 2.e3 (6%), often heading for a Stonewall.",
            lineName: "vs 2.e3",
            lineDescription: "Fianchetto as usual — the g7 bishop is exactly the right piece against Stonewall setups.",
            variations: line(
              { san: "g6", description: "White played the quiet e3. Fianchetto with g6 — your standard setup, and the g7 bishop bites on the dark squares a Stonewall leaves weak." },
              { san: "Bd3", description: "White develops the bishop to d3." },
              { san: "d6", description: "White played Bd3. Play d6, keeping e5 under control before deciding on a break." },
              { san: "f4", description: "White completes the Stonewall shape with f4." },
              { san: "Bg7", description: "White played f4. Finish the fianchetto with Bg7." },
              { san: "Nf3", description: "White develops the knight to f3." },
              { san: "O-O", description: "White played Nf3. Castle." },
              { san: "O-O", description: "White castles." },
              { san: "c5", description: "White castled. Now hit the centre with c5 — the Stonewall is slow, so you get your counterplay in first." },
              { san: "c3", description: "White props up d4 with c3." },
              { san: "Nc6", description: "White played c3. Develop Nc6, pressuring d4. You stand comfortably (+0.3) and White's attack has not even started." },
            ),
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

// ─── Petrov Defense (Stafford Gambit) ────────────────────────
const petrovTree: TreeMove[] = [
  {
    san: "e4",
    description: "White opens with the king's pawn to e4.",
    variations: [
      {
        san: "e5",
        description: "White played e4. Answer in the center with e5, staking your own claim.",
        variations: [
          {
            san: "Nf3",
            description: "White develops the knight to f3, attacking your e5 pawn.",
            variations: [
              {
                san: "Nf6",
                description: "White played Nf3. Play the Petrov (Russian) Defense with Nf6 — instead of defending e5, counter-attack White's e4 pawn.",
                variations: [
                  // ── 3.Nxe5: the Stafford Gambit ──
                  {
                    san: "Nxe5",
                    description: "White grabs the e5 pawn with the knight.",
                    variations: [
                      {
                        san: "Nc6",
                        description: "White played Nxe5. Unleash the Stafford Gambit with Nc6!? — offering the pawn to lure White's knight forward and gain a huge lead in development.",
                        lineName: "Stafford Gambit",
                        lineDescription: "Black sacrifices a pawn in the Petrov for rapid development, the bishop pair, and dangerous attacking chances against f2.",
                        variations: [
                          {
                            san: "Nxc6",
                            description: "White obliges and captures the knight on c6.",
                            variations: [
                              {
                                san: "dxc6",
                                description: "White played Nxc6. Recapture with dxc6 — opening the d-file, freeing your light-squared bishop, and reaching the Stafford tabiya with the bishop pair and fast development for the pawn.",
                                variations: [
                                  // ── 5.d3 ──
                                  {
                                    san: "d3",
                                    description: "White plays the solid d3, opening a bishop and bracing the center.",
                                    variations: [
                                      {
                                        san: "Bc5",
                                        description: "White played d3. Develop the bishop to c5, aiming straight at f2 — the soft spot in White's camp.",
                                        variations: [
                                          {
                                            san: "Bg5",
                                            description: "White pins your knight with Bg5, attacking the queen — but this natural move walks into the most famous Stafford trap.",
                                            lineName: "Stafford: Bg5 Mate Trap",
                                            lineDescription: "If White grabs the queen, Black mates by force.",
                                            variations: line(
                                              { san: "Nxe4", description: "White played Bg5. Play Nxe4!! — ignoring the threat to your queen. White's only safe reply is 7.dxe4; the greedy 7.Bxd8 loses on the spot." },
                                              { san: "Bxd8", description: "White grabs the queen with Bxd8 — taking the bait!" },
                                              { san: "Bxf2+", description: "White took the queen. Strike with Bxf2+! Your knight on e4 guards the bishop, so the king cannot capture it." },
                                              { san: "Ke2", description: "White is forced to play Ke2 — every other square is covered." },
                                              { san: "Bg4#", description: "White played Ke2. Finish with Bg4# — checkmate! The king has no escape, and the bishop can't be captured or blocked." },
                                            ),
                                          },
                                          {
                                            san: "Be2",
                                            description: "White develops solidly with Be2, sidestepping the tricks.",
                                            lineName: "Stafford: 6.Be2 Main Line",
                                            lineDescription: "White plays accurately; Black sets up a kingside attack with opposite-side castling.",
                                            variations: line(
                                              { san: "h5", description: "White played Be2. Play h5! — a key Stafford move that clamps the g4 square for your knight and readies a kingside pawn storm." },
                                              { san: "h3", description: "White prevents ...Ng4 with h3." },
                                              { san: "Qd6", description: "White played h3. Bring the queen to d6, eyeing the h2 square and preparing to castle queenside." },
                                              { san: "Nc3", description: "White develops the knight to c3." },
                                              { san: "Bd7", description: "White played Nc3. Develop the bishop to d7, connecting your rooks and clearing the way to castle long." },
                                              { san: "O-O", description: "White castles kingside — right into your attack." },
                                              { san: "O-O-O", description: "White castled short. Castle queenside (O-O-O)! With kings on opposite wings, hurl your h- and g-pawns at White's king while you hold the bishop pair and the initiative." },
                                            ),
                                          },
                                          {
                                            san: "Be3",
                                            description: "White offers a trade with Be3, challenging your best-placed piece. This is 13% of games here — the third most common try.",
                                            variations: [
                                              {
                                                san: "Bxe3",
                                                description: "White played Be3, offering to trade off your active bishop. Take it — Bxe3! White must recapture with the f-pawn, permanently doubling the e-pawns and stripping the cover from the king.",
                                                variations: [
                                                  {
                                                    san: "fxe3",
                                                    description: "White recaptures with the f-pawn, as they must — the structure is now badly damaged. You have two ways to play this: the solid ...Qd6, or the sharp ...Ng4 trap.",
                                                    variations: [
                                                      {
                                                        san: "Qd6",
                                                        description: "White played fxe3. Centralize with Qd6 — the solid choice. The queen eyes the weak e-pawns and the h2–b8 diagonal, and this is sound against anything White plays.",
                                                        lineName: "Stafford: 6.Be3",
                                                        lineDescription: "The sound treatment. Doubling White's e-pawns gives Black the most playable structure of any 6th move — about -0.5, and it works against every White reply.",
                                                        variations: line(
                                                          { san: "Be2", description: "White develops the bishop to e2." },
                                                          { san: "h5", description: "White played Be2. Play h5, clamping g4 and preparing to swing the rook along the third rank or open the h-file." },
                                                          { san: "Nc3", description: "White develops the knight to c3." },
                                                          { san: "Ng4", description: "White played Nc3. Jump to Ng4! With the f-pawn gone the knight is a permanent nuisance, hitting the e3 pawn and eyeing e5. You're only about half a pawn worse — comfortably the best of White's serious 6th moves." },
                                                        ),
                                                      },
                                                      {
                                                        san: "Ng4",
                                                        description: "White played fxe3. The sharp alternative: Ng4! immediately, hitting the e3 pawn. The knight is not really hanging — your c8 bishop guards g4 down the c8–g4 diagonal — so 8.Qxg4?? drops the queen to 8...Bxg4. WARNING: this is still a gamble, not a free win. White's correct 8.Qf3 leaves you close to a pawn worse (+0.9), and the follow-up 9.Qf4! makes it about +1.4. Play it when you want to fight; play ...Qd6 when you want safety.",
                                                        lineName: "Stafford: 6.Be3 Trap",
                                                        lineDescription: "A double-edged trap. The greedy 8.Qxg4?? loses the queen outright, and 9.Kd2? loses material to the only-move ...Qe5!. But White's best play leaves you worse — a gamble, clearly signposted.",
                                                        variations: line(
                                                          { san: "Qf3", description: "White defends e3 and develops with Qf3 — played 76% of the time, and objectively best (+0.9). Note what White must avoid: 8.Qxg4?? loses on the spot to 8...Bxg4, because your c8 bishop was defending the knight the whole time along the c8–g4 diagonal — queen for knight." },
                                                          { san: "Qg5", description: "White played Qf3. Pile on with Qg5, eyeing g2 and keeping the e3 pawn under fire. Strictly speaking 8...Qh4+ is a shade better (about +0.9 for White rather than +1.4), but Qg5 is the move that sets the trap — and White's reply here is wrong 43% of the time. White's best is 9.Qf4!, which most players miss." },
                                                          { san: "Kd2", description: "White defends e3 by walking the king to d2 — played 43% of the time, and it's the mistake you're hoping for." },
                                                          { san: "Nxh2", description: "White played Kd2?. Now snap off h2 — Nxh2! It looks like you're just losing the knight to Rxh2, and that's exactly why it works." },
                                                          { san: "Rxh2", description: "White takes the knight with Rxh2, apparently winning a piece." },
                                                          { san: "Qe5", description: "White played Rxh2. Here it is — Qe5!! and this is the ONLY move that works (everything else loses by four pawns). It forks the h2 rook and the b2 pawn, and White cannot defend both." },
                                                          { san: "Rh1", description: "White saves the rook with Rh1." },
                                                          { san: "Qxb2", description: "White played Rh1. Collect with Qxb2, hitting the a1 rook next." },
                                                          { san: "Nc3", description: "White blocks with Nc3, trying to trap your queen." },
                                                          { san: "Qxa1", description: "White played Nc3. Take the rook anyway — Qxa1! Your queen gets out via b2 or a5. You're up the exchange and a pawn (about +1.1) with the safer king." },
                                                        ),
                                                      },
                                                    ],
                                                  },
                                                ],
                                              },
                                            ],
                                          },
                                          {
                                            san: "Nc3",
                                            description: "White develops the knight to c3, defending e4.",
                                            lineName: "Stafford: 6.Nc3",
                                            lineDescription: "6.Nc3?! is a mistake: ...Ng4! hits f2 immediately and Black comes out a pawn up with the bishop pair — the best result the Stafford gets against any 6th move.",
                                            variations: line(
                                              { san: "Ng4", description: "White played Nc3, ignoring your threats. Strike at once with Ng4! — f2 is attacked twice (knight and bishop) and White has no comfortable way to defend it. Don't castle here: the slow 6...O-O lets White consolidate and leaves you nearly two pawns worse." },
                                              { san: "Be3", description: "White defends f2 the only real way, blocking with Be3." },
                                              { san: "Nxe3", description: "White played Be3. Take it — Nxe3 forces the issue, since recapturing wrecks White's kingside." },
                                              { san: "fxe3", description: "White must recapture with the f-pawn, shattering the pawns in front of the king." },
                                              { san: "Bxe3", description: "White played fxe3. Snap off the e3 pawn with your bishop! You've regained the gambit pawn, White's king is stuck in the centre behind ruined pawns, and you're now the one who is better." },
                                              { san: "Qf3", description: "White develops with tempo, hitting the c6 pawn and eyeing f7." },
                                              { san: "Bd4", description: "White played Qf3. Tuck the bishop back to d4 — it's safe, dominant on the long diagonal, and keeps White's king from ever finding shelter. Black is close to a pawn better here (~+1.0)." },
                                            ),
                                          },
                                        ],
                                      },
                                    ],
                                  },
                                  // ── 5.e5 ──
                                  {
                                    san: "e5",
                                    description: "White grabs space with e5, kicking your knight.",
                                    lineName: "Stafford: 5.e5 Advance",
                                    lineDescription: "The main Stafford trap: after 6.d3?? Black ignores the attacked knight and plays ...Bc5!, winning material by force.",
                                    variations: line(
                                      { san: "Ne4", description: "White played e5. Leap to e4 — a superb central square eyeing f2 and c3, and the single most trap-laden square in the Stafford." },
                                      { san: "d3", description: "White attacks your knight with d3 — the natural move, and a losing one." },
                                      { san: "Bc5", description: "White played d3 attacking your knight — IGNORE IT. Bc5! is the Stafford's signature trap: if White grabs with 7.dxe4?? then 7...Bxf2+ 8.Ke2 Bg4+ skewers the king and queen and wins the queen outright." },
                                      { san: "Qh5", description: "White finds the only real try, Qh5, defending f2 and hitting f7." },
                                      { san: "Nxf2", description: "White played Qh5. Take with Nxf2 anyway! The knight is immune and White's king is stuck in the center." },
                                      { san: "e6", description: "White counter-attacks with e6, trying to blast open f7." },
                                      { san: "Qe7", description: "White played e6. Calmly defend with Qe7 — you keep the extra piece and White's attack runs dry." },
                                      { san: "Qxf7+", description: "White forces the queens off with Qxf7+." },
                                      { san: "Qxf7", description: "White played Qxf7+. Recapture with the queen." },
                                      { san: "exf7+", description: "White recaptures with check." },
                                      { san: "Kxf7", description: "White played exf7+. Take with the king. Queens are off and material is dead even for the moment — but your knight on f2 collects the h1 rook in almost every line, and even against White's best (d4) the engine has you about +4. Completely winning with a safe king." },
                                    ),
                                  },
                                  // ── 5.Nc3 ──
                                  {
                                    san: "Nc3",
                                    description: "White develops the knight to c3, defending e4 before committing the center.",
                                    lineName: "Stafford: 5.Nc3",
                                    lineDescription: "Black launches a direct kingside attack, opening the h-file against White's king.",
                                    variations: line(
                                      { san: "Bc5", description: "White played Nc3. Develop Bc5, training the bishop on f2." },
                                      { san: "Be2", description: "White develops the bishop to e2." },
                                      { san: "h5", description: "White played Be2. Play h5, clamping g4 and preparing a kingside storm." },
                                      { san: "O-O", description: "White castles kingside." },
                                      { san: "Ng4", description: "White castled. Jump the knight to g4, hitting f2 and h2 and provoking a weakening." },
                                      { san: "Bxg4", description: "White trades it off with Bxg4." },
                                      { san: "hxg4", description: "White played Bxg4. Recapture with hxg4 — the h-file rips open and your rook on h8 stares down White's king. You have a fierce attack for the pawn." },
                                    ),
                                  },
                                  // ── 5.d4 ──
                                  {
                                    san: "d4",
                                    description: "White grabs the full center with d4.",
                                    lineName: "Stafford: 5.d4",
                                    lineDescription: "5.d4 is loose — Black just takes on e4 and fully equalizes, the best result the Stafford gets anywhere.",
                                    variations: line(
                                      { san: "Nxe4", description: "White played d4 — this is the one line where the Stafford is objectively fine. Just take the pawn! Nxe4 regains the gambit pawn immediately, and d4 has left White nothing to show for it." },
                                      { san: "c3", description: "White props up the d4 pawn with c3." },
                                      { san: "c5", description: "White played c3. Hit the center with c5, opening lines for your bishops before White consolidates." },
                                      { san: "Be2", description: "White develops the bishop to e2." },
                                      { san: "Be7", description: "White played Be2. Develop Be7 and prepare to castle — no need to force matters, you're already equal." },
                                      { san: "O-O", description: "White castles kingside." },
                                      { san: "O-O", description: "White castled. Castle too. Material is level, you have the bishop pair and easy development — a completely equal game (0.00). This is the Stafford's best-case scenario." },
                                    ),
                                  },
                                  // NOTE: 5.f3 is deliberately not covered. It is White's best
                                  // practical try (White scores 54%) and Black is ~-1.9 with best
                                  // play — there is no line worth drilling. If you expect it, play
                                  // the solid 3...d6 Petrov below instead of the Stafford.
                                  // ── 5.Bc4 ──
                                  {
                                    san: "Bc4",
                                    description: "White develops the bishop to c4 — and this is the best news in the entire Stafford. Black scores 57% from here, White's worst-scoring 5th move.",
                                    lineName: "Stafford: 5.Bc4",
                                    lineDescription: "White's worst practical try. The natural ...Bc5 scores 58% for Black here — the highest of any Stafford position.",
                                    variations: line(
                                      { san: "Bc5", description: "White played Bc4. Now the natural Bc5 is exactly right — unlike after 5.f3, here it scores 58% for you, the best result the Stafford gets anywhere. The bishops stare at each other but White's is the one that has to move again. (The engine slightly prefers 5...Nxe4, but it only scores 48% in practice — take the trap-rich line.)" },
                                      { san: "f3", description: "White finds the only really testing move, f3, shoring up e4." },
                                      { san: "O-O", description: "White played f3. Castle — get the king safe and let White work out what to do with the awkward c4 bishop." },
                                      { san: "d3", description: "White plays d3, supporting the centre." },
                                      { san: "b5", description: "White played d3. Kick the bishop with b5! Gaining queenside space with tempo is your standard plan whenever White's bishop sits on c4." },
                                      { san: "Bb3", description: "White retreats the bishop to b3." },
                                      { san: "a5", description: "White played Bb3. Keep rolling with a5, threatening ...a4 to trap or trade the bishop." },
                                      { san: "a4", description: "White stops the pawn with a4." },
                                      { san: "b4", description: "White played a4. Push past with b4, clamping the queenside. Your pawns have gained real space, White's bishop is buried on b3, and you have the initiative and easy play for the pawn." },
                                    ),
                                  },
                                ],
                              },
                            ],
                          },
                        ],
                      },
                      {
                        san: "d6",
                        description: "White played Nxe5. The solid alternative to the Stafford: kick the knight with d6 and regain the pawn by force. This is the real Petrov, and it's about 1.5 pawns better than 3...Nc6 — play it when you want a sound game rather than tricks.",
                        variations: [
                          {
                            san: "Nf3",
                            description: "White retreats the knight to f3 — forced, since staying on e5 loses a piece to ...Qe7 or ...d5.",
                            variations: [
                              {
                                san: "Nxe4",
                                description: "White retreated. Take on e4! Material is level again and you have a fully equal, sound position — the exact opposite of the Stafford's permanent pawn deficit.",
                                variations: [
                                  {
                                    san: "d4",
                                    description: "White builds the big centre with d4 — the main line, played 30% of the time.",
                                    lineName: "Petrov: 5.d4",
                                    lineDescription: "The classical main line. Black equalizes completely — Stockfish evaluates the final position at dead level (0.00).",
                                    variations: line(
                                      { san: "d5", description: "White played d4. Anchor the knight with d5! Now the e4 knight is defended by a pawn and can't be chased away." },
                                      { san: "Bd3", description: "White develops the bishop to d3, challenging your knight." },
                                      { san: "Nc6", description: "White played Bd3. Develop Nc6, hitting d4 and preparing to castle." },
                                      { san: "O-O", description: "White castles kingside." },
                                      { san: "Bg4", description: "White castled. Pin the f3 knight with Bg4 — the d4 pawn is now under real pressure." },
                                      { san: "c3", description: "White shores up d4 with c3." },
                                      { san: "f5", description: "White played c3. Reinforce the outpost with f5! Your knight on e4 is now untouchable, and the position is completely equal (0.00) — a full, sound game with no material deficit." },
                                    ),
                                  },
                                  {
                                    san: "Qe2",
                                    description: "White pins the knight along the e-file with Qe2, hoping to win it. Played 24% of the time.",
                                    lineName: "Petrov: 5.Qe2",
                                    lineDescription: "White's tricky pin — meet it with the symmetrical ...Qe7 and the pin dissolves.",
                                    variations: line(
                                      { san: "Qe7", description: "White pinned your knight with Qe2. Answer with Qe7! — the symmetrical reply. Now the pin is neutralized because White's queen is pinned too, and if queens come off you're perfectly fine." },
                                      { san: "d3", description: "White plays d3, finally attacking the knight for real." },
                                      { san: "Nf6", description: "White played d3. Retreat the knight to f6 — you've done your job, material is level and White's queen on e2 is now the awkward piece." },
                                      { san: "Bg5", description: "White pins your knight with Bg5." },
                                      { san: "Be6", description: "White played Bg5. Develop Be6, preparing to castle queenside and connect your rooks." },
                                      { san: "Nc3", description: "White develops the knight to c3." },
                                      { san: "Nc6", description: "White played Nc3. Complete development with Nc6. The position is level (about -0.1) with mutual chances — a normal game." },
                                    ),
                                  },
                                  {
                                    san: "Nc3",
                                    description: "White challenges the knight immediately with Nc3. Played 21% of the time.",
                                    lineName: "Petrov: 5.Nc3",
                                    lineDescription: "White trades off the centralized knight; you develop naturally and reach a sound game.",
                                    variations: line(
                                      { san: "Nf6", description: "White played Nc3, attacking your knight. Simply retreat to f6 — you've already regained the pawn, so there is nothing to prove. Trading on c3 would only help White's centre." },
                                      { san: "d4", description: "White grabs the centre with d4." },
                                      { san: "Be7", description: "White played d4. Develop Be7 and prepare to castle; solid and flexible." },
                                      { san: "Bd3", description: "White develops the bishop to d3." },
                                      { san: "O-O", description: "White played Bd3. Castle — king safety first in a symmetrical structure." },
                                      { san: "O-O", description: "White castles too." },
                                      { san: "Bg4", description: "White castled. Pin the knight with Bg4, adding pressure to d4 and freeing your position. Material is level and you're solid." },
                                    ),
                                  },
                                  {
                                    san: "d3",
                                    description: "White nudges the knight with d3 first, intending d4 next. Played 11% of the time.",
                                    lineName: "Petrov: 5.d3",
                                    lineDescription: "A slower move-order that usually transposes to the 5.Nc3 structures.",
                                    variations: line(
                                      { san: "Nf6", description: "White played d3, attacking the knight. Retreat to f6 — the pawn is already regained and White has spent a tempo on d3 that they'll want back." },
                                      { san: "d4", description: "White follows up with d4, taking two moves to do what 5.d4 does in one." },
                                      { san: "Be7", description: "White played d4, but has lost a tempo getting there. Develop Be7 and prepare to castle." },
                                      { san: "Bd3", description: "White develops the bishop to d3." },
                                      { san: "O-O", description: "White played Bd3. Castle to safety." },
                                      { san: "O-O", description: "White castles." },
                                      { san: "Bg4", description: "White castled. Pin with Bg4 — the same comfortable setup as the 5.Nc3 line, and here you're effectively a tempo better off." },
                                    ),
                                  },
                                  {
                                    san: "Bc4",
                                    description: "White develops the bishop to c4, eyeing f7. Played 7% — and Black scores well against it.",
                                    lineName: "Petrov: 5.Bc4",
                                    lineDescription: "Answer the bishop with ...d5, gaining space with tempo. Black scores 59% here.",
                                    variations: line(
                                      { san: "d5", description: "White played Bc4, aiming at f7. Hit the bishop at once with d5! You gain space with tempo and shut the bishop's diagonal." },
                                      { san: "Bb3", description: "White retreats the bishop to b3." },
                                      { san: "Nc5", description: "White played Bb3. Reroute the knight to c5! It attacks the b3 bishop and heads for the excellent e6 or e4 squares." },
                                      { san: "O-O", description: "White castles kingside." },
                                      { san: "Be7", description: "White castled. Develop Be7 and prepare to castle. You have a space advantage, level material and easy play — Black scores 59% from here in practice." },
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
                  // ── 3.Nc3: Four Knights ──
                  // 3.Nc3 is 32.8% — almost exactly as common as 3.Nxe5, so all four
                  // of White's main 4th moves get their own line.
                  {
                    san: "Nc3",
                    description: "White declines the pawn grab and develops with Nc3, heading for the Four Knights. This is 33% of games — just as likely as the Stafford, so know it just as well.",
                    variations: [
                      {
                        san: "Nc6",
                        description: "White played Nc3. Defend e5 and develop with Nc6, mirroring White — played by half of all players here and perfectly sound.",
                        variations: [
                          {
                            san: "Bc4",
                            description: "White develops the Italian bishop to c4, eyeing f7 — the most popular 4th move at 33%.",
                            lineName: "Four Knights: 4.Bc4",
                            lineDescription: "The fork trick! ...Nxe4 wins a pawn back by force and leaves Black clearly better.",
                            variations: line(
                              { san: "Nxe4", description: "White played Bc4 — and this allows the classic fork trick. Take with Nxe4! If White recaptures with Nxe4 you hit the knight and the bishop at once with ...d5." },
                              { san: "Nxe4", description: "White recaptures with the knight, walking into it." },
                              { san: "d5", description: "White played Nxe4. Now the point — d5! forks the knight on e4 and the bishop on c4. White cannot save both cleanly." },
                              { san: "Bxd5", description: "White grabs the pawn with the bishop." },
                              { san: "Qxd5", description: "White played Bxd5. Recapture with the queen. You've regained everything and White's knight on e4 is loose in the centre." },
                              { san: "Nc3", description: "White retreats the knight with tempo on your queen." },
                              { san: "Qd6", description: "White played Nc3. Step back to d6 — safe, central, and eyeing the open lines. You're clearly better here (about +1.6) with the extra centre pawn and easy development." },
                            ),
                          },
                          {
                            san: "d4",
                            description: "White strikes the centre with d4, the Scotch Four Knights — 26% of games.",
                            lineName: "Four Knights: 4.d4 (Scotch)",
                            lineDescription: "Pin with ...Bb4 and liquidate; Black comes out with the better structure.",
                            variations: line(
                              { san: "Bb4", description: "White played d4. Pin the c3 knight with Bb4! — it stops White recapturing comfortably and is far better than the routine ...exd4." },
                              { san: "dxe5", description: "White pushes past with dxe5, attacking your f6 knight." },
                              { san: "Nxe4", description: "White played dxe5. Grab the pawn with Nxe4! The pin on c3 means White can't just take your knight." },
                              { san: "Bd2", description: "White breaks the pin with Bd2." },
                              { san: "Bxc3", description: "White played Bd2. Trade on c3 — you're forcing the issue while White's structure suffers." },
                              { san: "Bxc3", description: "White recaptures with the bishop." },
                              { san: "Nxc3", description: "White played Bxc3. Take again on c3! White must recapture with a pawn and accept doubled, damaged pawns." },
                              { san: "bxc3", description: "White recaptures with the b-pawn, leaving doubled c-pawns. You're better (about +0.7) with the healthier structure." },
                            ),
                          },
                          {
                            san: "Bb5",
                            description: "White pins with Bb5, the Spanish Four Knights — 23% of games.",
                            lineName: "Four Knights: 4.Bb5 (Rubinstein)",
                            lineDescription: "The Rubinstein counter-gambit ...Nd4! — Black's best-scoring answer at 65%.",
                            variations: line(
                              { san: "Nd4", description: "White pinned with Bb5. Play the Rubinstein — Nd4!! Instead of the passive ...Bb4, jump into the centre and offer a pawn. It scores 65% for Black and takes most opponents completely out of book." },
                              { san: "Nxd4", description: "White takes the knight." },
                              { san: "exd4", description: "White played Nxd4. Recapture with the pawn, kicking the c3 knight and gaining time." },
                              { san: "Ne2", description: "White retreats the knight to e2." },
                              { san: "c6", description: "White played Ne2. Chase the bishop with c6 — you're building a big pawn centre while White's pieces shuffle backwards." },
                              { san: "Bd3", description: "White retreats the bishop to d3." },
                              { san: "d5", description: "White played Bd3. Take the full centre with d5! You have a dominant pawn duo and White's pieces are passive — Black is clearly better (about +0.9)." },
                            ),
                          },
                          {
                            san: "d3",
                            description: "White plays the quiet d3, keeping everything solid — 7% of games.",
                            lineName: "Four Knights: 4.d3",
                            lineDescription: "The quiet line — free your position with ...d5 and trade into an easy game.",
                            variations: line(
                              { san: "d5", description: "White played the modest d3. Strike in the centre with d5! When White plays quietly, seize the space they've declined." },
                              { san: "exd5", description: "White captures on d5." },
                              { san: "Nxd5", description: "White played exd5. Recapture with the knight, centralizing it on a fine square." },
                              { san: "Nxd5", description: "White trades knights on d5." },
                              { san: "Qxd5", description: "White played Nxd5. Recapture with the queen — she's active in the centre and can't easily be chased." },
                              { san: "Be2", description: "White develops modestly with Be2." },
                              { san: "Bf5", description: "White played Be2. Develop Bf5, hitting the loose d3 pawn and completing your setup. You're comfortable with more space and freer pieces." },
                            ),
                          },
                        ],
                      },
                    ],
                  },
                  // ── 3.d4: Modern Attack ──
                  {
                    san: "d4",
                    description: "White challenges the center directly with d4, the Modern Attack.",
                    lineName: "Modern Attack (3.d4)",
                    lineDescription: "The main alternative to capturing on e5; Black equalizes comfortably.",
                    variations: line(
                      { san: "Nxe4", description: "White played d4. Grab the e4 pawn with Nxe4 — the principled Petrov response, unafraid of the open position." },
                      { san: "Bd3", description: "White develops the bishop to d3, attacking your knight." },
                      { san: "d5", description: "White played Bd3. Support the knight and stake out the center with d5." },
                      { san: "Nxe5", description: "White regains the pawn with Nxe5." },
                      { san: "Nd7", description: "White played Nxe5. Challenge the strong knight with Nd7." },
                      { san: "Nxd7", description: "White trades on d7." },
                      { san: "Bxd7", description: "White played Nxd7. Recapture with Bxd7 — you have a free, equal game with easy development." },
                    ),
                  },
                  // ── 3.Bc4 ──
                  {
                    san: "Bc4",
                    description: "White develops the bishop to c4, eyeing f7 instead of grabbing e5.",
                    lineName: "3.Bc4 (Boden–Kieseritzky)",
                    lineDescription: "Black snatches e4; White gets development for the pawn.",
                    variations: line(
                      { san: "Nxe4", description: "White played Bc4. Snatch the e4 pawn with Nxe4 — the c4 bishop no longer defends it." },
                      { san: "Nc3", description: "White offers the Boden–Kieseritzky Gambit with Nc3, sacrificing the pawn for quick development." },
                      { san: "Nxc3", description: "White played Nc3. Trade with Nxc3, accepting the challenge." },
                      { san: "dxc3", description: "White recaptures with dxc3, opening lines for rapid development." },
                      { san: "f6", description: "White played dxc3. Shore up your extra pawn with f6, guarding e5 — develop carefully and your material edge should tell." },
                    ),
                  },
                  // ── 3.d3 ──
                  {
                    san: "d3",
                    description: "White plays the quiet d3, defending e4 without committing to anything. Played 6.8% of the time.",
                    lineName: "3.d3 Quiet Line",
                    lineDescription: "White declines every critical continuation — take the centre with ...d5 and equalize comfortably.",
                    variations: line(
                      { san: "Nc6", description: "White played the modest d3, protecting e4 but conceding the initiative. Develop Nc6 and prepare to take over the centre." },
                      { san: "Be2", description: "White develops quietly with Be2." },
                      { san: "d5", description: "White played Be2. Strike with d5! White's passive setup gives you a free hand — grab the space they declined to take." },
                      { san: "exd5", description: "White captures on d5." },
                      { san: "Nxd5", description: "White played exd5. Recapture with the knight, centralizing it." },
                      { san: "O-O", description: "White castles kingside." },
                      { san: "Be7", description: "White castled. Develop Be7 and get ready to castle yourself — no rush, you already have the freer game." },
                      { san: "c4", description: "White challenges your knight with c4." },
                      { san: "Nb6", description: "White played c4. Retreat to b6, where the knight eyes c4 and d5. The position is dead level (0.00) and you have a comfortable, easy game." },
                    ),
                  },
                ],
              },
            ],
          },
          {
            san: "f4",
            description: "White plays the King's Gambit (9% here) — without an answer to this, your Petrov never gets to exist.",
            lineName: "King's Gambit: Falkbeer",
            lineDescription: "Refuse the gambit entirely: 2...d5 turns the tables, and after the c6 follow-up you are the one attacking. Ends +0.7 for you.",
            variations: line(
              { san: "d5", description: "White offered the King's Gambit. Don't take it — counter in the centre with d5!, the Falkbeer. White wanted you grabbing f4 and defending; instead White has to solve problems." },
              { san: "exd5", description: "White captures on d5 (66% here)." },
              { san: "c6", description: "White played exd5. Offer a second pawn with c6! — you want the lines open while White's kingside is already loosened by f4." },
              { san: "dxc6", description: "White grabs the second pawn (57% here)." },
              { san: "Nxc6", description: "White played dxc6. Recapture with the knight — you are a pawn down with both centre files opening onto White's weakened king." },
              { san: "Nf3", description: "White develops the knight to f3." },
              { san: "e4", description: "White played Nf3. Push e4!, gaining space and hitting the f3 knight — it has to move again." },
              { san: "Ne5", description: "White's knight jumps to e5." },
              { san: "Nf6", description: "White played Ne5. Develop Nf6, keeping the initiative — every piece comes out with a threat." },
              { san: "Bb5", description: "White pins with Bb5." },
              { san: "Bc5", description: "White played Bb5. Develop Bc5, aiming at f2 through White's airy kingside. You are still a pawn down, but the engine already prefers you (+0.7) — the f4 hole and open lines are worth more." },
            ),
          },
          {
            san: "Bc4",
            description: "White plays the Bishop's Opening (10% here), delaying Nf3.",
            lineName: "Bishop's Opening: 2...Nf6",
            lineDescription: "Develop normally with Nf6 and c6. If White snatches e5 with Nxe5 — a third of games — Qa5+! wins the knight on the spot (+3.2).",
            variations: line(
              { san: "Nf6", description: "White played Bc4. Counter-attack e4 with Nf6, just as in your Petrov." },
              { san: "d3", description: "White defends e4 with d3, the main move." },
              { san: "c6", description: "White played d3. Play c6 — it prepares ...d5 to blunt the c4 bishop, and quietly clears the a5–e1 diagonal for your queen. Remember that diagonal." },
              { san: "Nf3", description: "White develops the knight to f3." },
              { san: "Be7", description: "White played Nf3. Develop Be7, keeping e5 apparently loose — it is bait." },
              { san: "Nxe5", description: "White grabs the pawn — 34% of players do — and it loses a piece on the spot." },
              { san: "Qa5+", description: "White played Nxe5?? Now Qa5+! — the check and the attack on the e5 knight come from the same square (this is why c6 cleared that diagonal). White cannot deal with both." },
              { san: "Nc3", description: "White blocks the check with Nc3." },
              { san: "Qxe5", description: "White played Nc3. Collect the knight with Qxe5 — you are a clean piece for a pawn up (+3.2)." },
              { san: "O-O", description: "White castles, hoping for compensation that isn't there." },
              { san: "O-O", description: "White castled. Castle too and consolidate." },
              { san: "f4", description: "White gains a tempo on your queen with f4." },
              { san: "Qd4+", description: "White played f4. Step out with Qd4+! — picking the active square with check, so White cannot use the tempo. Still +3.3." },
            ),
          },
          {
            san: "Nc3",
            description: "White plays the Vienna (6% here), keeping f4 options open.",
            lineName: "Vienna: 3...d5",
            lineDescription: "Against the Vienna Gambit setup, ...d5 is the standard counter — meet a flank strike with a central one.",
            variations: line(
              { san: "Nf6", description: "White played the Vienna Nc3. Develop Nf6 as usual — your normal Petrov move works here too." },
              { san: "f4", description: "White launches the Vienna Gambit with f4." },
              { san: "d5", description: "White played f4. Counter in the centre with d5! — the standard answer to the Vienna Gambit. Taking on f4 instead is exactly what White prepared for." },
              { san: "fxe5", description: "White captures on e5." },
              { san: "Nxe4", description: "White played fxe5. Recapture the centre with Nxe4 — your knight is magnificent there and e5 is weak." },
              { san: "Qf3", description: "White attacks the knight with Qf3, the sharpest try." },
              { san: "f5", description: "White played Qf3. Defend the knight with f5! — solid, and it keeps the e5 pawn surrounded." },
              { san: "d3", description: "White challenges the knight with d3." },
              { san: "Nxc3", description: "White played d3. Trade with Nxc3, damaging White's queenside pawns on the way out." },
              { san: "bxc3", description: "White recaptures with the b-pawn." },
              { san: "d4", description: "White played bxc3. Push d4!, fixing the doubled c-pawns and cramping White's development." },
              { san: "Qg3", description: "White repositions the queen to g3." },
              { san: "Be6", description: "White played Qg3. Develop Be6 and prepare long castling. You stand slightly better (+0.4) with the healthier structure." },
            ),
          },
          {
            san: "d4",
            description: "White plays the Center Game (6% here), or the Danish Gambit after c3.",
            lineName: "Center Game: 2...exd4",
            lineDescription: "Take on d4, then decline the Danish with ...d5 — you return the pawn for full equality instead of weathering White's attack.",
            variations: line(
              { san: "exd4", description: "White played d4. Just take it — exd4 is the principled reply." },
              { san: "c3", description: "White offers the Danish Gambit with c3, hoping for dxc3 and raking bishops." },
              { san: "d5", description: "White played the Danish c3. Decline it with d5! — hand the pawn back on your terms and White's whole attacking setup never appears." },
              { san: "exd5", description: "White captures on d5." },
              { san: "Nf6", description: "White played exd5. Develop Nf6, recovering the d5 pawn shortly with easy piece play." },
              { san: "cxd4", description: "White restores material with cxd4." },
              { san: "Bb4+", description: "White played cxd4. Check with Bb4+, developing with tempo." },
              { san: "Nc3", description: "White blocks with Nc3." },
              { san: "O-O", description: "White played Nc3. Castle — your development lead matters more than the d5 pawn, which isn't going anywhere." },
              { san: "Nf3", description: "White develops the knight to f3." },
              { san: "Re8+", description: "White played Nf3. Rook to e8 with check — one more developing move with tempo." },
              { san: "Be2", description: "White blocks with Be2." },
              { san: "Qe7", description: "White played Be2. Pile on the pin with Qe7. White is nominally a pawn up, but the e-file pressure gives you complete equality (0.0) with the easier game." },
            ),
          },
        ],
      },
    ],
  },
];

// ─── Scandinavian Defense (Black's repertoire) ───────────────
const scandinavianTree: TreeMove[] = [
  {
    san: "e4",
    description: "White opens with the king's pawn to e4.",
    variations: [
      {
        san: "d5",
        description: "White played e4. Strike back immediately with the Scandinavian Defense, d5 — challenging the center on move one.",
        variations: [
          {
            san: "exd5",
            description: "White captures on d5.",
            variations: [
              {
                san: "Qxd5",
                description: "White played exd5. Recapture with the queen (Qxd5) — the classical main line. The queen comes out early, but you regain the pawn and develop with a solid structure.",
                lineName: "Scandinavian: 2...Qxd5",
                lineDescription: "Black recaptures with the queen and meets White's tempo gain with solid development.",
                variations: [
                  {
                    san: "Nc3",
                    description: "White develops the knight to c3, attacking your queen.",
                    variations: [
                      {
                        san: "Qa5",
                        description: "White hit your queen with Nc3. Retreat to a5, the classical main line — the queen is active on the a5–e1 diagonal.",
                        lineName: "Scandinavian: 3...Qa5 Main Line",
                        lineDescription: "The classical main line; Black develops solidly with ...c6, ...Bf5, ...e6.",
                        variations: line(
                          { san: "d4", description: "White takes the full center with d4." },
                          { san: "Nf6", description: "White played d4. Develop your knight to f6, controlling e4." },
                          { san: "Nf3", description: "White develops the knight to f3." },
                          { san: "c6", description: "White played Nf3. Play c6 — a key Scandinavian move that gives your queen a safe retreat and prepares ...Bf5." },
                          { san: "Bc4", description: "White develops the bishop to c4, eyeing f7." },
                          { san: "Bf5", description: "White played Bc4. Develop your bishop to f5 before shutting it in with ...e6." },
                          { san: "Bd2", description: "White plays Bd2, preparing to castle queenside." },
                          { san: "e6", description: "White played Bd2. Play e6, opening your dark-squared bishop and solidifying." },
                          { san: "Qe2", description: "White brings the queen to e2 and prepares to castle long." },
                          { san: "Bb4", description: "White played Qe2. Pin the c3 knight with Bb4, increasing your pressure." },
                          { san: "O-O-O", description: "White castles queenside, heading for a sharp, double-edged middlegame. You have a sound position with active pieces — castle and play on the queenside." },
                        ),
                      },
                      {
                        san: "Qd6",
                        description: "White hit your queen with Nc3. Play the modern Qd6 — flexible and safe, keeping the queen active without exposing it.",
                        lineName: "Scandinavian: 3...Qd6",
                        lineDescription: "The modern main line; Black expands on the queenside with ...a6 and ...b5.",
                        variations: line(
                          { san: "d4", description: "White builds the center with d4." },
                          { san: "Nf6", description: "White played d4. Develop your knight to f6." },
                          { san: "Nf3", description: "White develops the knight to f3." },
                          { san: "a6", description: "White played Nf3. Play a6, stopping Nb5 and preparing ...b5 with queenside expansion." },
                          { san: "g3", description: "White fianchettoes with g3." },
                          { san: "b5", description: "White played g3. Gain queenside space with b5." },
                          { san: "Bg2", description: "White completes the fianchetto with Bg2." },
                          { san: "Bb7", description: "White played Bg2. Mirror with Bb7, contesting the long diagonal." },
                          { san: "O-O", description: "White castles." },
                          { san: "e6", description: "White castled. Play e6, completing your harmonious development — you have an active, comfortable game." },
                        ),
                      },
                      {
                        san: "Qd8",
                        description: "White hit your queen with Nc3. Retreat all the way to d8 — passive but rock-solid, keeping a sound structure.",
                        lineName: "Scandinavian: 3...Qd8",
                        lineDescription: "The solid, passive retreat; Black aims for a quiet, sound game.",
                        variations: line(
                          { san: "d4", description: "White takes the big center with d4." },
                          { san: "Nf6", description: "White played d4. Develop your knight to f6." },
                          { san: "Nf3", description: "White develops the knight to f3." },
                          { san: "g6", description: "White played Nf3. Fianchetto with g6, aiming your bishop at White's center." },
                          { san: "Bc4", description: "White develops the bishop to c4." },
                          { san: "Bg7", description: "White played Bc4. Complete the fianchetto with Bg7." },
                          { san: "O-O", description: "White castles." },
                          { san: "O-O", description: "White castled. Castle (O-O) — you're solid, if a little passive; aim for ...c5 or ...Nc6 to free your game." },
                        ),
                      },
                    ],
                  },
                ],
              },
              {
                san: "Nf6",
                description: "White played exd5. Play Nf6 — the Modern Scandinavian, developing first and recapturing d5 next move.",
                variations: [
                  {
                    san: "d4",
                    description: "White grabs the center with d4, holding the d5 pawn for now.",
                    variations: [
                      {
                        san: "Nxd5",
                        description: "White played d4. Recapture with the knight (Nxd5) — a sound, flexible setup.",
                        lineName: "Scandinavian: 2...Nf6 Modern",
                        lineDescription: "Black recaptures on d5 with the knight and develops actively.",
                        variations: line(
                          { san: "Nf3", description: "White develops the knight to f3." },
                          { san: "Bg4", description: "White played Nf3. Pin the knight with Bg4, developing actively." },
                          { san: "Be2", description: "White breaks the pin with Be2." },
                          { san: "e6", description: "White played Be2. Play e6, opening your bishop and preparing to develop and castle." },
                          { san: "O-O", description: "White castles." },
                          { san: "Be7", description: "White castled. Develop the bishop to e7 and prepare to castle — solid, just a touch less space." },
                        ),
                      },
                      {
                        san: "Bg4",
                        description: "White played d4. Play the Portuguese Gambit with Bg4!? — instead of regaining the pawn, develop with tempo and pressure White's center.",
                        lineName: "Scandinavian: Portuguese Gambit",
                        lineDescription: "Black gambits the d5 pawn with ...Bg4 for fast development.",
                        variations: line(
                          { san: "Be2", description: "White declines the gambit and offers a trade with Be2." },
                          { san: "Bxe2", description: "White played Be2. Trade bishops with Bxe2." },
                          { san: "Qxe2", description: "White recaptures with the queen." },
                          { san: "Qxd5", description: "White played Qxe2. Regain your pawn with Qxd5, reaching equal material with active pieces." },
                          { san: "Nf3", description: "White develops the knight to f3." },
                          { san: "Nc6", description: "White played Nf3. Develop the knight to c6, hitting d4." },
                          { san: "c4", description: "White gains space and hits your queen with c4." },
                          { san: "Qe4", description: "White played c4, hitting your queen. Don't crawl back to d8 — step forward with Qe4! Offering the trade on e2 keeps White from consolidating, and after the passive ...Qd8 White gets a free hand and a clear edge." },
                          { san: "Be3", description: "White declines the trade and develops with Be3." },
                          { san: "e6", description: "White played Be3. Open a path for the f8 bishop with e6. Your queen sits actively on e4 and White's extra space hasn't turned into anything concrete — you're only marginally worse." },
                        ),
                      },
                    ],
                  },
                  {
                    san: "Nc3",
                    description: "White declines to hold d5 and just develops Nc3 (34% here — the most common move).",
                    lineName: "Modern Declined: 4.Nc3",
                    lineDescription: "Recapture on d5, trade into the queen-recapture structures you already know, and castle long.",
                    variations: line(
                      { san: "Nxd5", description: "White played Nc3, not defending d5. Simply recapture — Nxd5 restores material with a good game." },
                      { san: "Nxd5", description: "White trades knights on d5." },
                      { san: "Qxd5", description: "White played Nxd5. Recapture with the queen — this is now a normal Scandinavian queen structure, the kind you already train." },
                      { san: "Nf3", description: "White develops the knight to f3." },
                      { san: "Nc6", description: "White played Nf3. Develop Nc6, eyeing d4." },
                      { san: "Be2", description: "White develops the bishop to e2." },
                      { san: "Bg4", description: "White played Be2. Pin with Bg4 — the standard active square for this bishop in the Scandinavian." },
                      { san: "O-O", description: "White castles kingside." },
                      { san: "O-O-O", description: "White castled short. Castle long! Opposite-side castling gives you the h-file plans you know from your 3...Qa5 lines." },
                      { san: "d3", description: "White solidifies with d3." },
                      { san: "e6", description: "White played d3. Open the f8 bishop's diagonal with e6. A level game (-0.2) in a structure you already understand." },
                    ),
                  },
                  {
                    san: "c4",
                    description: "White clings to the extra pawn with c4 (22% here) — greedy, and you punish it with a real gambit.",
                    lineName: "Modern Declined: 4.c4 Gambit",
                    lineDescription: "c6 and then e5! — a genuine double-pawn gambit. Two pawns down, the engine still prefers you (+0.3): White's development never recovers.",
                    variations: line(
                      { san: "c6", description: "White played c4 to keep the pawn. Offer another with c6! — if White grabs everything, the files that open point straight at White's undeveloped position." },
                      { san: "dxc6", description: "White takes on c6 (76% here)." },
                      { san: "e5", description: "White played dxc6. Now e5! — the second gambit pawn. You want diagonals for both bishops, not the pawn back." },
                      { san: "cxb7", description: "White grabs again with cxb7 (59% do)." },
                      { san: "Bxb7", description: "White played cxb7. Recapture with Bxb7 — count it: two pawns down, but every one of your pieces will come out with tempo and White has moved almost nothing but pawns." },
                      { san: "Nf3", description: "White finally develops, attacking e5." },
                      { san: "e4", description: "White played Nf3. Push e4, hitting the knight — it must move again while you develop." },
                      { san: "Ng5", description: "White's knight goes to g5." },
                      { san: "Bc5", description: "White played Ng5. Develop Bc5, aiming at f2 — the attack builds by itself." },
                      { san: "Be2", description: "White develops the bishop to e2." },
                      { san: "h6", description: "White played Be2. Kick the knight with h6. Two pawns down, and the engine still likes you (+0.3) — that is how much the activity is worth." },
                    ),
                  },
                  {
                    san: "Nf3",
                    description: "White develops Nf3 (14% here), letting the d5 pawn go.",
                    lineName: "Modern Declined: 4.Nf3",
                    lineDescription: "Recapture and set up a fianchetto against White's big centre — a standard structure, with your King's Indian ideas doing the work.",
                    variations: line(
                      { san: "Nxd5", description: "White played Nf3. Recapture with Nxd5 — material is level again and your knight is well placed." },
                      { san: "d4", description: "White takes the centre with d4." },
                      { san: "g6", description: "White played d4. Fianchetto with g6 — against a big pawn centre, the g7 bishop is your best piece, exactly as in your King's Indian." },
                      { san: "c4", description: "White gains space with c4, hitting your knight." },
                      { san: "Nb6", description: "White played c4. Retreat to b6, where the knight keeps an eye on c4 and d5." },
                      { san: "Nc3", description: "White develops the knight to c3." },
                      { san: "Bg7", description: "White played Nc3. Complete the fianchetto with Bg7, pressuring d4 down the long diagonal." },
                      { san: "Be3", description: "White supports d4 with Be3." },
                      { san: "O-O", description: "White played Be3. Castle." },
                      { san: "Be2", description: "White develops the bishop to e2." },
                      { san: "Nc6", description: "White played Be2. Develop Nc6, adding a third hit on d4. The engine mildly favours White's centre (about -1.1), but this is a standard fianchetto middlegame with clear plans — chip at d4 with e5 or c5 breaks." },
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

// ─── Bishop's Opening (White's repertoire) ───────────────────
const bishopsOpeningTree: TreeMove[] = [
  {
    san: "e4",
    description: "Open with the king's pawn, e4.",
    variations: [
      {
        san: "e5",
        description: "Black answers symmetrically with e5.",
        variations: [
          {
            san: "Bc4",
            description: "Black played e5. Play the Bishop's Opening with Bc4 — develop the bishop to its best diagonal, eye the f7 square, and keep your knight flexible.",
            variations: [
              {
                san: "Nf6",
                description: "Black plays the Bishop's Berlin (Nf6), attacking your e4 pawn — the most principled reply, which discourages early queen sorties like Qf3 or Qh5.",
                lineName: "Bishop's Berlin (2...Nf6)",
                lineDescription: "Black's most principled defense; you settle for a sound, classical game.",
                variations: line(
                  { san: "d3", description: "Black hit your e4 pawn. Defend it solidly with d3 — don't reach for tricky queen moves; aim for a healthy, classical setup." },
                  { san: "c6", description: "Black plays c6, preparing the ...d5 break." },
                  { san: "Nf3", description: "Black played c6. Develop the knight to f3, eyeing the center." },
                  { san: "d5", description: "Black strikes with d5, hitting your e4 pawn and bishop." },
                  { san: "Bb3", description: "Black played d5. Retreat the bishop to b3, keeping it on the strong a2–g8 diagonal." },
                  { san: "Bd6", description: "Black develops the bishop to d6." },
                  { san: "O-O", description: "Black played Bd6. Castle (O-O) and get your king safe." },
                  { san: "O-O", description: "Black castles." },
                  { san: "Re1", description: "Black castled. Reinforce e4 with Re1 — you have a sound, balanced position with easy development." },
                ),
              },
              {
                san: "c6",
                description: "Black plays the Philidor Counter-Attack (c6), preparing to push ...d5 to hit your bishop and grab the center.",
                lineName: "Philidor Counter-Attack (2...c6)",
                lineDescription: "Black prepares ...d5; you develop and meet the break head-on.",
                variations: line(
                  { san: "Nf3", description: "Black prepares ...d5. Develop the knight to f3, pressuring e5 and getting ready to castle." },
                  { san: "d5", description: "Black strikes with d5, attacking your bishop and e4." },
                  { san: "exd5", description: "Black played d5. Capture with exd5, opening the position before Black gets a big center." },
                  { san: "cxd5", description: "Black recaptures with cxd5 — the d5 pawn now hits your bishop." },
                  { san: "Bb5+", description: "Black played cxd5. Develop with check using Bb5+, gaining a tempo." },
                  { san: "Nc6", description: "Black blocks the check with Nc6." },
                  { san: "O-O", description: "Black played Nc6. Castle (O-O); you have an easy, harmonious game against Black's slightly loose center." },
                  { san: "Bd6", description: "Black develops the bishop to d6, defending e5." },
                ),
              },
              {
                san: "Nc6",
                description: "Black plays the Classical Defense (Nc6), a flexible developing move that controls d4 and e5 and keeps options open.",
                lineName: "Classical Defense (2...Nc6)",
                lineDescription: "A symmetrical, flexible setup; you head for a solid Giuoco Pianissimo.",
                variations: line(
                  { san: "Nf3", description: "Black developed Nc6. Develop your knight to f3, attacking e5 and transposing toward Italian waters." },
                  { san: "Nf6", description: "Black develops the knight to f6, attacking e4." },
                  { san: "d3", description: "Black played Nf6. Defend e4 with d3, choosing the quiet, solid Giuoco Pianissimo setup." },
                  { san: "Bc5", description: "Black develops the bishop to c5." },
                  { san: "O-O", description: "Black played Bc5. Castle (O-O) to safety." },
                  { san: "d6", description: "Black solidifies with d6." },
                  { san: "c3", description: "Black played d6. Play c3, preparing a later d4 break to expand in the center." },
                  { san: "O-O", description: "Black castles. Both sides are developed for a slow, maneuvering game where you can build toward d4." },
                ),
              },
            ],
          },
        ],
      },
    ],
  },
];

// ─── Caro-Kann (as White) ────────────────────────────────────
// Your answer to 1...c6 (8.3% of replies to 1.e4). The Advance Variation (3.e5)
// takes space and gives clear plans, sidestepping the heavy theory of 3.Nc3.
// Lines follow the most-played reply for Black and the best-scoring practical
// choice for White at 1600–2000, then verified with Stockfish.
const whiteVsCaroKannTree: TreeMove[] = [
  {
    san: "e4",
    description: "Open with e4.",
    variations: [
      {
        san: "c6",
        description: "Black plays the Caro-Kann — preparing ...d5 with a pawn behind it, unlike the French where the light-squared bishop gets locked in.",
        variations: [
          {
            san: "d4",
            description: "Black played c6, preparing ...d5. Take the full centre with d4 before Black gets to challenge it.",
            variations: [
              {
                san: "d5",
                description: "Black strikes at your centre with d5, exactly as the Caro-Kann intends.",
                variations: [
                  {
                    san: "e5",
                    description: "Black played d5. Push past with e5 — the Advance Variation. You gain space and keep the position closed, and unlike the French, Black's problem bishop gets out to f5 first, so you play against it.",
                    variations: [
                      {
                        san: "Bf5",
                        description: "Black develops the bishop outside the pawn chain with Bf5 — played 68% of the time and the whole point of the Caro-Kann.",
                        lineName: "Advance: 3...Bf5",
                        lineDescription: "The main line. You develop calmly and target the b6/c5 squares behind Black's centre.",
                        variations: line(
                          { san: "Nf3", description: "Black played Bf5. Develop naturally with Nf3 — the solid treatment. (The sharp 4.h4 h5 5.Bg5 line lets Black grab on b2 and score well, so keep it simple.)" },
                          { san: "e6", description: "Black supports the d5 pawn with e6." },
                          { san: "Be2", description: "Black played e6. Develop Be2, preparing to castle. The bishop is modest here but the plan is c4 or Be3 hitting the queenside dark squares." },
                          { san: "c5", description: "Black counter-attacks your centre with c5." },
                          { san: "Be3", description: "Black played c5. Reinforce d4 with Be3 — the pawn chain is your space advantage, so don't give it up cheaply." },
                          { san: "Qb6", description: "Black hits b2 and piles on d4 with Qb6." },
                          { san: "Nc3", description: "Black played Qb6. Develop Nc3 and let the b2 pawn go if Black wants it — you're well ahead in development and the queen is misplaced on b2." },
                          { san: "Nc6", description: "Black brings the last minor piece toward the centre. You have space, a comfortable game, and clear play against d5 and c5." },
                        ),
                      },
                      {
                        san: "c5",
                        description: "Black hits the base of your pawn chain immediately with c5 — the second most popular try at 23%.",
                        lineName: "Advance: 3...c5",
                        lineDescription: "Black challenges d4 at once; you take the pawn and hold it with a queenside space grab.",
                        variations: line(
                          { san: "dxc5", description: "Black played c5. Just take it — dxc5. Holding the extra pawn is awkward for Black to prove compensation against." },
                          { san: "Nc6", description: "Black develops Nc6, eyeing the e5 pawn." },
                          { san: "a3", description: "Black played Nc6 hitting e5. Play a3! — quietly preparing b4 to defend c5 with a pawn chain rather than clinging to e5." },
                          { san: "Nxe5", description: "Black regains the pawn on e5." },
                          { san: "b4", description: "Black took on e5. Play b4, locking the extra c5 pawn in place and grabbing serious queenside space." },
                          { san: "Nf6", description: "Black develops the kingside knight." },
                          { san: "Bb2", description: "Black played Nf6. Fianchetto with Bb2 — the bishop rakes the long diagonal and supports your queenside pawn mass." },
                          { san: "Nc6", description: "Black retreats the knight to c6. Material is level but your extra c5 pawn and queenside space give you the easier game." },
                        ),
                      },
                      {
                        san: "e6",
                        description: "Black plays e6 first, shutting in the c8 bishop — a French-style setup, and the concession the Caro-Kann is meant to avoid.",
                        lineName: "Advance: 3...e6",
                        lineDescription: "Black voluntarily locks in the bad bishop; you build the standard c3/Bd3/Nf3 clamp.",
                        variations: line(
                          { san: "c3", description: "Black played e6, burying the c8 bishop. Support d4 with c3 — with Black's bishop passive, you have a risk-free space advantage." },
                          { san: "c5", description: "Black challenges the centre with c5." },
                          { san: "Bd3", description: "Black played c5. Develop Bd3 — the strong diagonal aiming at h7, the standard Advance setup." },
                          { san: "Nc6", description: "Black develops the knight to c6." },
                          { san: "Nf3", description: "Black played Nc6. Complete development with Nf3, defending d4 a second time." },
                          { san: "Qb6", description: "Black pressures b2 and d4 with Qb6." },
                          { san: "dxc5", description: "Black played Qb6. Release the tension with dxc5! — the queen on b6 now bites on granite and you keep a pleasant space edge." },
                          { san: "Bxc5", description: "Black recaptures with the bishop. You're comfortably better: more space and a permanently passive black light-squared bishop." },
                        ),
                      },
                      {
                        san: "g6",
                        description: "Black fianchettoes with g6, developing the dark-squared bishop instead of solving the c8 bishop's problem.",
                        lineName: "Advance: 3...g6",
                        lineDescription: "A rarer setup; straightforward development gives you a comfortable space edge.",
                        variations: line(
                          { san: "Nf3", description: "Black played g6. Develop Nf3 — solid and flexible; Black's kingside fianchetto is slow against your extra space." },
                          { san: "Bg7", description: "Black completes the fianchetto." },
                          { san: "Bd3", description: "Black played Bg7. Develop Bd3, ready to castle and eyeing the h7 square." },
                          { san: "Bg4", description: "Black pins the knight with Bg4." },
                          { san: "Nbd2", description: "Black played Bg4. Develop Nbd2 — it supports the coming h3 and keeps your structure intact." },
                          { san: "e6", description: "Black solidifies the centre with e6." },
                          { san: "h3", description: "Black played e6. Question the bishop with h3. Black must either trade it off or retreat, and you keep a durable space advantage." },
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

// ─── French (as White) ───────────────────────────────────────
// Your answer to 1...e6 (11.3% of replies to 1.e4). Three systems side by side:
// the Tarrasch (3.Nd2), the Advance (3.e5), and the Exchange (3.exd5) — pick by
// taste, or drill all three.
const whiteVsFrenchTree: TreeMove[] = [
  {
    san: "e4",
    description: "Open with e4.",
    variations: [
      {
        san: "e6",
        description: "Black plays the French Defense, preparing ...d5 — solid, but it shuts in the c8 bishop.",
        variations: [
          {
            san: "d4",
            description: "Black played e6. Occupy the centre with d4; Black will challenge with ...d5 next.",
            variations: [
              {
                san: "d5",
                description: "Black challenges your centre with d5, the point of the French.",
                variations: [
                  // ── Tarrasch: 3.Nd2 ──
                  {
                    san: "Nd2",
                    description: "Black played d5. Play the Tarrasch with Nd2 — defending e4 while sidestepping the Winawer's annoying ...Bb4 pin entirely (3.Nc3 Bb4 is Black's sharpest try).",
                    variations: [
                      {
                        san: "Nf6",
                        description: "Black develops Nf6, hitting e4 again — the most popular reply at 38%.",
                        lineName: "Tarrasch: 3...Nf6",
                        lineDescription: "The closed Tarrasch: you push past and build a space clamp with c3 and Ne2.",
                        variations: line(
                          { san: "e5", description: "Black played Nf6 attacking e4. Push past with e5, gaining space and kicking the knight to a poor square." },
                          { san: "Nfd7", description: "Black retreats the knight to d7, where it eyes the e5 and c5 breaks." },
                          { san: "Bd3", description: "Black retreated to d7. Develop Bd3 — the classic French bishop, aiming at h7 across the board." },
                          { san: "c5", description: "Black hits the base of your chain with c5." },
                          { san: "c3", description: "Black played c5. Prop up d4 with c3 — your whole space advantage rests on this pawn chain." },
                          { san: "Nc6", description: "Black adds a second attacker to d4." },
                          { san: "Ne2", description: "Black played Nc6. Develop Ne2! — the knight belongs here in the Tarrasch, supporting d4 a third time and heading for f4 or g3." },
                          { san: "Qb6", description: "Black piles up on d4 with Qb6. Your centre holds, you have more space, and the plan is f4 and a kingside attack while Black's c8 bishop is still asleep." },
                        ),
                      },
                      {
                        san: "c5",
                        description: "Black hits the centre immediately with c5 — the open Tarrasch, played 26%.",
                        lineName: "Tarrasch: 3...c5",
                        lineDescription: "Black accepts an isolated queen's pawn; you develop fast and blockade d4.",
                        variations: line(
                          { san: "exd5", description: "Black played c5. Take with exd5 — the point is to leave Black with an isolated d-pawn after the recapture." },
                          { san: "exd5", description: "Black recaptures with the e-pawn, accepting the isolated queen's pawn." },
                          { san: "Ngf3", description: "Black now has an isolated d5 pawn. Develop Ngf3, heading to blockade the square in front of it." },
                          { san: "Nf6", description: "Black develops the kingside knight." },
                          { san: "Bb5+", description: "Black played Nf6. Check with Bb5+! — gaining a tempo and provoking a slight weakening before Black is fully coordinated." },
                          { san: "Nc6", description: "Black blocks the check with the knight." },
                          { san: "O-O", description: "Black blocked with Nc6. Castle — get the king safe and prepare to pile onto the isolated d5 pawn with Re1 and Nb3." },
                          { san: "Be7", description: "Black develops the bishop and prepares to castle. You have the long-term target on d5 and the easier plan." },
                        ),
                      },
                      {
                        san: "dxe4",
                        description: "Black releases the tension at once with dxe4 — the Rubinstein Tarrasch, played 23%.",
                        lineName: "Tarrasch: 3...dxe4",
                        lineDescription: "Black gives up the centre early; you get free development and a lasting pull.",
                        variations: line(
                          { san: "Nxe4", description: "Black played dxe4, conceding the centre. Recapture with Nxe4 — the knight sits beautifully and you're already better developed." },
                          { san: "Nf6", description: "Black challenges the strong knight with Nf6." },
                          { san: "Nxf6+", description: "Black played Nf6. Trade with Nxf6+ — Black's recapture will either wreck the structure or misplace the queen." },
                          { san: "Qxf6", description: "Black recaptures with the queen, avoiding doubled pawns but exposing her early." },
                          { san: "Bd3", description: "Black recaptured with the queen. Develop Bd3, hitting h7 and gaining time on the exposed queen's diagonal." },
                          { san: "Bd6", description: "Black develops the bishop to d6." },
                          { san: "Nf3", description: "Black played Bd6. Complete development with Nf3; you have a comfortable, risk-free advantage and Black's light-squared bishop is still a problem piece." },
                          { san: "h6", description: "Black makes luft. You're better developed with a pleasant, easy game." },
                        ),
                      },
                      {
                        san: "Nc6",
                        description: "Black develops Nc6, a rarer move-order that blocks the c-pawn.",
                        lineName: "Tarrasch: 3...Nc6",
                        lineDescription: "Black's knight blocks the ...c5 break; you develop smoothly and castle.",
                        variations: line(
                          { san: "Ngf3", description: "Black played Nc6, which gets in the way of the ...c5 break. Develop Ngf3 and just complete your pieces — Black has no quick counterplay." },
                          { san: "Nf6", description: "Black develops the second knight." },
                          { san: "Bd3", description: "Black played Nf6. Develop Bd3, holding e4 a second time and eyeing the kingside." },
                          { san: "dxe4", description: "Black releases the tension with dxe4." },
                          { san: "Nxe4", description: "Black played dxe4. Recapture with the knight — you have a free hand in the centre." },
                          { san: "Be7", description: "Black develops modestly with Be7." },
                          { san: "O-O", description: "Black played Be7. Castle and finish development; you have more space and the healthier structure." },
                          { san: "O-O", description: "Black castles too. You're comfortably better with an easy plan of c3 and Re1." },
                        ),
                      },
                    ],
                  },
                  // ── Advance: 3.e5 ──
                  {
                    san: "e5",
                    description: "Black played d5. Play the Advance with e5 — a space-grabbing system with the same structures as the Advance Caro-Kann, and here Black's c8 bishop is genuinely bad.",
                    lineName: "Advance Variation",
                    lineDescription: "Grab space, hold d4 with c3, and play against Black's locked-in light-squared bishop.",
                    variations: line(
                      { san: "c5", description: "Black attacks the base of your pawn chain with c5 — almost automatic in the Advance." },
                      { san: "c3", description: "Black played c5. Defend d4 with c3. The chain d4–e5 is your space advantage; everything revolves around holding it." },
                      { san: "Nc6", description: "Black adds another attacker to d4." },
                      { san: "Nf3", description: "Black played Nc6. Develop Nf3, defending d4 again and preparing to castle." },
                      { san: "Qb6", description: "Black piles onto d4 and b2 with Qb6 — the standard French plan." },
                      { san: "a3", description: "Black played Qb6. Play a3! — preparing b4 to buttress the chain, and taking b4 away from Black's pieces." },
                      { san: "cxd4", description: "Black releases the tension with cxd4." },
                      { san: "cxd4", description: "Black played cxd4. Recapture with cxd4, keeping the strong pawn duo." },
                      { san: "Nge7", description: "Black routes the knight via e7 toward f5 to hit d4. You hold the centre and have a clear kingside space advantage." },
                    ),
                  },
                  // ── Exchange: 3.exd5 ──
                  {
                    san: "exd5",
                    description: "Black played d5. The Exchange with exd5 is the simplest system of all — symmetrical structure, no theory to memorize. Solid, though it does hand Black easy equality.",
                    lineName: "Exchange Variation",
                    lineDescription: "Symmetrical and safe. Easiest to learn, but the least ambitious of the three.",
                    variations: line(
                      { san: "exd5", description: "Black recaptures, and the position is symmetrical. The upside: Black's problem bishop is now free, but so is your extra tempo." },
                      { san: "Nf3", description: "Black recaptured on d5. Develop Nf3 — in a symmetrical structure the extra tempo is your only edge, so don't waste moves." },
                      { san: "Nf6", description: "Black mirrors your development." },
                      { san: "c4", description: "Black played Nf6. Break the symmetry with c4! — challenging d5 and giving the game some actual content." },
                      { san: "c6", description: "Black holds the d5 pawn with c6." },
                      { san: "Bd3", description: "Black played c6. Develop Bd3 toward the kingside; you have a small but risk-free pull." },
                      { san: "Bd6", description: "Black mirrors again with Bd6." },
                      { san: "O-O", description: "Black played Bd6. Castle. The position is balanced but you're a tempo up with a clear plan of Re1 and Nc3." },
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

// ─── Sicilian (as White) ─────────────────────────────────────
// Your answer to 1...c5 (23.3% of replies to 1.e4 — the most common after
// 1...e5). Three systems: the Open Sicilian (2.Nf3 + 3.d4), the Alapin (2.c3),
// and the bishop checks (Rossolimo 3.Bb5 / Moscow 3.Bb5+).
const whiteVsSicilianTree: TreeMove[] = [
  {
    san: "e4",
    description: "Open with e4.",
    variations: [
      {
        san: "c5",
        description: "Black plays the Sicilian — the most common answer to 1.e4 after 1...e5, and statistically Black's best-scoring defense.",
        variations: [
          {
            san: "Nf3",
            description: "Black played the Sicilian. Develop Nf3 — the flexible move that keeps both the Open Sicilian (3.d4) and the bishop checks (3.Bb5) on the table.",
            variations: [
              {
                san: "Nc6",
                description: "Black develops the queen's knight — the most popular reply at 43%.",
                variations: [
                  {
                    san: "d4",
                    description: "Black played Nc6. Blast open the centre with d4 — the Open Sicilian, the most testing try.",
                    lineName: "Open Sicilian: 2...Nc6",
                    lineDescription: "Black grabs space with ...e5; you exploit the d5 hole with a Maroczy-style clamp.",
                    variations: line(
                      { san: "cxd4", description: "Black takes on d4, as almost everyone does." },
                      { san: "Nxd4", description: "Black played cxd4. Recapture with the knight — this is the Open Sicilian proper. Your knight dominates the centre." },
                      { san: "e5", description: "Black kicks the knight at once with e5 — the Sveshnikov/Kalashnikov idea, accepting a hole on d5." },
                      { san: "Nb5", description: "Black played e5, weakening d5. Jump to b5! — the knight heads for d6 or supports the clamp, and Black must spend time stopping Nd6+." },
                      { san: "d6", description: "Black covers the d6 square with the pawn." },
                      { san: "c4", description: "Black played d6. Clamp with c4! — the Maroczy Bind. You take total control of d5, the hole Black created on move 5." },
                      { san: "a6", description: "Black kicks the knight with a6." },
                      { san: "N5c3", description: "Black played a6. Retreat with N5c3, keeping the bind intact — the knight has done its job forcing ...d6." },
                      { san: "Nf6", description: "Black develops the kingside knight. You have a permanent grip on d5 and a comfortable, strategically clear position." },
                    ),
                  },
                  {
                    san: "Bb5",
                    description: "Black played Nc6. Alternatively play the Rossolimo with Bb5 — dodging the entire Open Sicilian theory load while still fighting for an edge. It scores 50% for White.",
                    variations: [
                      {
                        san: "g6",
                        description: "Black fianchettoes with g6, the main Rossolimo reply.",
                        lineName: "Rossolimo: 3...g6",
                        lineDescription: "Black fianchettoes; you take space with e5 and target the d5 square.",
                        variations: line(
                          { san: "O-O", description: "Black played g6. Just castle — you keep the option of Bxc6 wrecking Black's structure for later." },
                          { san: "Bg7", description: "Black completes the fianchetto." },
                          { san: "Re1", description: "Black played Bg7. Play Re1, quietly preparing the e5 push that gains space." },
                          { san: "Nf6", description: "Black develops the knight to f6." },
                          { san: "e5", description: "Black played Nf6. Push e5! — gaining space with tempo and kicking the knight to the rim of your territory." },
                          { san: "Nd5", description: "Black centralizes the knight on d5." },
                          { san: "Nc3", description: "Black played Nd5. Challenge it immediately with Nc3 — trades favour you here since Black's dark squares get loose." },
                          { san: "Nc7", description: "Black retreats to c7 to avoid the trade. You have a space advantage and Black's pieces are tangled." },
                        ),
                      },
                      {
                        san: "e6",
                        description: "Black plays e6, preparing a quick ...Nge7 and ...d5.",
                        lineName: "Rossolimo: 3...e6",
                        lineDescription: "Black aims for ...d5; you keep the bishop with a4-c2 and build a slow clamp.",
                        variations: line(
                          { san: "O-O", description: "Black played e6. Castle first — no rush to commit the bishop." },
                          { san: "Nge7", description: "Black develops the knight to e7, supporting the ...d5 break." },
                          { san: "c3", description: "Black played Nge7. Support a future d4 with c3, building the centre slowly." },
                          { san: "a6", description: "Black questions your bishop with a6." },
                          { san: "Ba4", description: "Black played a6. Retreat to a4 — keep the bishop; on the a4–c2 diagonal it becomes a strong attacking piece." },
                          { san: "b5", description: "Black gains queenside space and hits the bishop again." },
                          { san: "Bc2", description: "Black played b5. Tuck the bishop on c2, aiming at h7 — exactly the Ruy López regrouping you already know." },
                          { san: "d5", description: "Black finally achieves the d5 break. The structure resembles a Ruy López and you have a comfortable, familiar game." },
                        ),
                      },
                    ],
                  },
                ],
              },
              {
                san: "d6",
                description: "Black plays d6, heading for the Najdorf or Dragon — 32% of replies.",
                variations: [
                  {
                    san: "d4",
                    description: "Black played d6. Open the centre with d4 — into the Open Sicilian and the main Najdorf battleground.",
                    lineName: "Open Sicilian: Najdorf",
                    lineDescription: "The English Attack setup with f3 — a clear, plan-based way to meet the Najdorf.",
                    variations: line(
                      { san: "cxd4", description: "Black takes on d4." },
                      { san: "Nxd4", description: "Black played cxd4. Recapture with the knight, reaching the main Open Sicilian tabiya." },
                      { san: "Nf6", description: "Black develops with tempo, attacking your e4 pawn." },
                      { san: "Nc3", description: "Black played Nf6 hitting e4. Defend it naturally with Nc3, developing at the same time." },
                      { san: "a6", description: "Black plays a6 — the Najdorf, controlling b5 and preparing ...e5 or ...e6." },
                      { san: "f3", description: "Black played the Najdorf. Answer with f3! — the English Attack. You bolster e4 and prepare Be3, Qd2, g4 with a straightforward kingside pawn storm." },
                      { san: "e5", description: "Black gains space and kicks your knight with e5." },
                      { san: "Nb3", description: "Black played e5. Retreat to b3 — the knight is fine here and Black has permanently weakened d5." },
                      { san: "Be6", description: "Black develops the bishop to cover d5. Your plan is clear: Be3, Qd2, g4 and attack. Black's d5 hole is a lasting target." },
                    ),
                  },
                  {
                    san: "Bb5+",
                    description: "Black played d6. Alternatively give the Moscow check with Bb5+ — another way to duck the Open Sicilian entirely, forcing Black to block awkwardly.",
                    lineName: "Moscow: 3.Bb5+",
                    lineDescription: "Trade off the light-squared bishops and play a comfortable, low-theory setup.",
                    variations: line(
                      { san: "Bd7", description: "Black blocks with the bishop, the most common reply." },
                      { san: "Bxd7+", description: "Black blocked with Bd7. Trade with Bxd7+ — Black must recapture with a piece, and every recapture has a small drawback." },
                      { san: "Nxd7", description: "Black recaptures with the knight, keeping the queen flexible." },
                      { san: "O-O", description: "Black played Nxd7. Castle. You've traded off your 'bad' bishop and Black's development is slightly clumsy." },
                      { san: "Ngf6", description: "Black develops the second knight to f6." },
                      { san: "Qe2", description: "Black played Ngf6. Develop Qe2, connecting the rooks and supporting a later e5 or c3-d4." },
                      { san: "g6", description: "Black fianchettoes the dark-squared bishop." },
                      { san: "c3", description: "Black played g6. Play c3, preparing d4 to claim the centre on your own terms." },
                      { san: "Bg7", description: "Black completes the fianchetto. You have a pleasant, risk-free game with a clear d4 plan — and none of the Najdorf theory." },
                    ),
                  },
                ],
              },
              {
                san: "e6",
                description: "Black plays e6, heading for the Kan or Taimanov — 17% of replies.",
                lineName: "Open Sicilian: 2...e6",
                lineDescription: "Against the Kan, the Maroczy clamp with c4 takes the sting out of Black's flexibility.",
                variations: line(
                  { san: "d4", description: "Black played e6. Open the centre with d4 as usual." },
                  { san: "cxd4", description: "Black takes on d4." },
                  { san: "Nxd4", description: "Black played cxd4. Recapture with the knight." },
                  { san: "a6", description: "Black plays a6 — the Kan Variation, staying flexible and controlling b5." },
                  { san: "c4", description: "Black played the Kan. Clamp down with c4! — the Maroczy Bind. It kills Black's ...b5 and ...d5 breaks and leaves you with a lasting space advantage." },
                  { san: "Qc7", description: "Black develops the queen to c7, eyeing the c-file and e5." },
                  { san: "Nc3", description: "Black played Qc7. Develop Nc3, reinforcing the bind on d5." },
                  { san: "Nf6", description: "Black develops the kingside knight." },
                  { san: "a3", description: "Black played Nf6. Play a3 — a useful prophylactic move stopping ...Bb4 and preparing to expand with b4." },
                  { san: "Nc6", description: "Black develops the last knight. You hold the bind, Black has no easy freeing break, and you can build slowly with Be2 and O-O." },
                ),
              },
              {
                san: "g6",
                description: "Black fianchettoes immediately — the Accelerated Dragon, 5% of replies.",
                lineName: "Open Sicilian: Accelerated Dragon",
                lineDescription: "The Maroczy Bind is the critical test of Black's early fianchetto.",
                variations: line(
                  { san: "d4", description: "Black played g6. Open with d4 — Black's early fianchetto lets you set up the strongest anti-Dragon formation." },
                  { san: "cxd4", description: "Black takes on d4." },
                  { san: "Nxd4", description: "Black played cxd4. Recapture with the knight." },
                  { san: "Bg7", description: "Black completes the fianchetto, aiming the bishop down the long diagonal." },
                  { san: "c4", description: "Black played Bg7. Set the Maroczy Bind with c4! — this is the critical test of the Accelerated Dragon. It takes d5 and b5 away from Black permanently." },
                  { san: "Nc6", description: "Black develops the knight to c6, hitting your d4 knight." },
                  { san: "Nc2", description: "Black played Nc6. Retreat to c2! — avoiding the trade on d4 that would relieve Black's cramp, and keeping the bind." },
                  { san: "Nf6", description: "Black develops the kingside knight." },
                  { san: "Nc3", description: "Black played Nf6. Develop Nc3, covering d5 a second time — the whole point of the bind." },
                  { san: "O-O", description: "Black castles. You have a durable space advantage and Black must find a freeing break that the bind makes very hard." },
                ),
              },
            ],
          },
          // ── Alapin: 2.c3 ──
          {
            san: "c3",
            description: "Black played the Sicilian. The Alapin with c3 is the low-maintenance option — you meet every Sicilian defense with one system, preparing d4 with a big centre. No Najdorf or Dragon theory needed.",
            variations: [
              {
                san: "d5",
                description: "Black challenges the centre immediately with d5 — the critical and most popular reply.",
                lineName: "Alapin: 2...d5",
                lineDescription: "Black grabs the centre back; you get free development against the exposed queen.",
                variations: line(
                  { san: "exd5", description: "Black played d5. Take with exd5 — Black has to recapture with the queen and lose time." },
                  { san: "Qxd5", description: "Black recaptures with the queen, which will soon be harassed." },
                  { san: "d4", description: "Black's queen is out early on d5. Build the centre with d4 — exactly what c3 was for." },
                  { san: "cxd4", description: "Black takes on d4." },
                  { san: "cxd4", description: "Black played cxd4. Recapture with the c-pawn, giving you a clean, strong centre." },
                  { san: "Nc6", description: "Black develops the knight, hitting d4." },
                  { san: "Nf3", description: "Black played Nc6. Develop Nf3, defending d4 and preparing to gain time on the queen." },
                  { san: "Bg4", description: "Black pins the knight with Bg4." },
                  { san: "Be2", description: "Black played Bg4. Break the pin with Be2 — simple development, and you're ready to castle with an isolated-pawn position where you hold the initiative." },
                  { san: "e6", description: "Black solidifies with e6. You have an easy game: better development and a clear plan of O-O, Nc3 and pressure down the c-file." },
                ),
              },
              {
                san: "Nf6",
                description: "Black attacks e4 immediately with Nf6 — the other main Alapin try.",
                lineName: "Alapin: 2...Nf6",
                lineDescription: "You push past and chase the knight while building the centre.",
                variations: line(
                  { san: "e5", description: "Black played Nf6 attacking e4. Push past with e5, kicking the knight and gaining space." },
                  { san: "Nd5", description: "Black centralizes the knight on d5, where it looks good but is easy to harass." },
                  { san: "d4", description: "Black played Nd5. Build the big centre with d4 — this is exactly the position c3 was preparing." },
                  { san: "cxd4", description: "Black takes on d4." },
                  { san: "Nf3", description: "Black played cxd4. Develop with Nf3 rather than rushing the recapture — you'll win the pawn back and your lead in development is worth more than a tempo." },
                  { san: "Nc6", description: "Black develops the knight to c6." },
                  { san: "Bc4", description: "Black played Nc6. Develop Bc4, hitting the d5 knight and eyeing f7." },
                  { san: "Nb6", description: "Black retreats the knight to b6, attacking your bishop." },
                  { san: "Bb3", description: "Black played Nb6. Retreat to b3 — the bishop stays on the strong a2–g8 diagonal and keeps eyeing f7." },
                  { san: "d5", description: "Black stakes out space with d5. The position is balanced but you have easy, natural development and a clear plan." },
                ),
              },
              {
                san: "Nc6",
                description: "Black develops Nc6 (30% here — the most common reply the Alapin plan had no answer to).",
                lineName: "Alapin: 2...Nc6",
                lineDescription: "Build the d4 centre anyway; after Black's ...d5 break you develop with tempo against the queen. Roughly level, with your structure the easier to play.",
                variations: line(
                  { san: "d4", description: "Black played Nc6. Proceed with the plan — d4, claiming the full centre." },
                  { san: "cxd4", description: "Black captures on d4 (89% here)." },
                  { san: "cxd4", description: "Black played cxd4. Recapture with the c-pawn — the whole point of the Alapin: a clean e4+d4 pawn duo." },
                  { san: "d5", description: "Black strikes back in the centre with d5." },
                  { san: "exd5", description: "Black played d5. Take with exd5 — Black must recapture with the queen and give you developing tempi." },
                  { san: "Qxd5", description: "Black recaptures with the queen (98% here)." },
                  { san: "Nf3", description: "Black played Qxd5. Develop Nf3, shielding d4 and getting ready to harass the queen." },
                  { san: "Bg4", description: "Black pins the knight with Bg4." },
                  { san: "Be2", description: "Black played Bg4. Break the pin calmly with Be2." },
                  { san: "e6", description: "Black opens the f8 bishop with e6." },
                  { san: "h3", description: "Black played e6. Put the question to the bishop with h3 — it must trade or retreat, and either way you complete development smoothly. About level (-0.2), with a clear plan: pile on the isolated d-pawn structure ideas you know from the 2...d5 line." },
                ),
              },
              {
                san: "d6",
                description: "Black plays a Najdorf-style d6 (16% here) — but against the Alapin setup it is too slow.",
                lineName: "Alapin: 2...d6",
                lineDescription: "You get the full e4+d4 centre for free against a King's-Indian-style setup. +0.7 with easy moves.",
                variations: line(
                  { san: "d4", description: "Black played the slow d6. Take the whole centre with d4 — this is exactly what c3 was for." },
                  { san: "cxd4", description: "Black captures on d4." },
                  { san: "cxd4", description: "Black played cxd4. Recapture with the c-pawn — e4 and d4 stand unchallenged." },
                  { san: "Nf6", description: "Black develops the knight, hitting e4." },
                  { san: "Nc3", description: "Black played Nf6. Defend e4 with Nc3 — normal development, no tricks needed." },
                  { san: "g6", description: "Black fianchettoes with g6, heading for a King's Indian shape a tempo down." },
                  { san: "h3", description: "Black played g6. Insert h3 — it takes g4 away from Black's pieces permanently, a standard prophylactic move in this structure." },
                  { san: "Bg7", description: "Black completes the fianchetto." },
                  { san: "Nf3", description: "Black played Bg7. Develop Nf3 behind the h3 umbrella." },
                  { san: "O-O", description: "Black castles." },
                  { san: "Be2", description: "Black castled. Develop Be2 and castle next. You have the big centre, more space and +0.7 — Black must generate counterplay against a position with no weaknesses." },
                ),
              },
              {
                san: "e6",
                description: "Black plays e6 (15% here), aiming for ...d5 under better terms.",
                lineName: "Alapin: 2...e6",
                lineDescription: "Meet ...d5 with e5! — a French Advance where c3 came for free. +1.1 with a kingside space plan.",
                variations: line(
                  { san: "d4", description: "Black played e6. Build the centre with d4 as always." },
                  { san: "cxd4", description: "Black captures on d4." },
                  { san: "cxd4", description: "Black played cxd4. Recapture with the c-pawn." },
                  { san: "d5", description: "Black plays d5, reaching for a French structure." },
                  { san: "e5", description: "Black played d5. Advance e5! — this is a French Advance where you got c3-cxd4 in for free, a whole tempo up on the normal version." },
                  { san: "Nc6", description: "Black develops Nc6, pressuring d4." },
                  { san: "Nc3", description: "Black played Nc6. Develop Nc3 — with the c-pawn already traded, the knight belongs on its best square." },
                  { san: "Bb4", description: "Black pins with Bb4." },
                  { san: "Nf3", description: "Black played Bb4. Develop Nf3, guarding d4 and simply ignoring the pin — the knight on c3 is going nowhere anyway." },
                  { san: "Nge7", description: "Black develops the knight to e7, heading for f5." },
                  { san: "Bd3", description: "Black played Nge7. Develop Bd3, covering the f5 square the knight wants and aiming at the kingside. +1.1 — your extra tempo turned the French Advance into a clearly better version." },
                ),
              },
            ],
          },
        ],
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
  { id: "petrov-defense", name: "Petrov Defense", description: "A counter-attacking answer to 1.e4 e5 2.Nf3, featuring the tricky Stafford Gambit for Black.", tree: petrovTree },
  { id: "scandinavian-defense", name: "Scandinavian Defense", description: "Black strikes at the center with 1...d5, regaining the pawn with quick, active development.", tree: scandinavianTree },
  { id: "bishops-opening", name: "Bishop's Opening", description: "White's 1.e4 e5 2.Bc4 — a flexible, classical setup, here against Black's three main replies.", tree: bishopsOpeningTree },
  // ── White's 1.e4 repertoire, one opening per reply Black can choose ──
  // Together with the Ruy López (1...e5) these cover ~87% of what you face.
  { id: "white-vs-sicilian", name: "Sicilian (as White)", description: "Your answer to 1...c5 (23.3% of replies to 1.e4) — the Open Sicilian, the Alapin, and the Rossolimo/Moscow bishop checks side by side.", tree: whiteVsSicilianTree },
  { id: "white-vs-french", name: "French (as White)", description: "Your answer to 1...e6 (11.3% of replies to 1.e4) — the Tarrasch, the Advance and the Exchange, so you can pick the system that suits you.", tree: whiteVsFrenchTree },
  { id: "white-vs-caro-kann", name: "Caro-Kann (as White)", description: "Your answer to 1...c6 (8.3% of replies to 1.e4): the Advance Variation, taking space and playing against Black's bishop.", tree: whiteVsCaroKannTree },
  { id: "anti-scandinavian", name: "Scandinavian (as White)", description: "Your answer to 1...d5 (8.9% of replies to 1.e4): take on d5 and gain time hunting the black queen.", tree: antiScandinavianTree },
];

/** Openings with lines derived from the tree. No redundancy in source data. */
export const openingsData: Opening[] = openingsWithTrees.map((o) => ({
  id: o.id,
  name: o.name,
  description: o.description,
  lines: linesFromTree(o.tree),
}));
