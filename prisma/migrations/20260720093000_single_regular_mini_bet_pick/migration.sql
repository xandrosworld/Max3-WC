CREATE UNIQUE INDEX "MiniBetPick_userId_matchId_type_regular_key"
ON "MiniBetPick"("userId", "matchId", "type")
WHERE "type" <> 'EXACT_SCORE'::"MiniBetType";
