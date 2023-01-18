const { dataSource } = require("../../orm")
const { Brackets } = require("typeorm")

const MatchId = dataSource.getRepository("matchid")
const GameInfo = dataSource.getRepository("game_info")
const ChampRate = dataSource.getRepository("champ_rate")
const ChampBan = dataSource.getRepository("champ_ban")
const ChampSpell = dataSource.getRepository("champ_spell")

const logger = require("../../log")

async function gameTotal(version) {
    return await GameInfo.createQueryBuilder().where("version = :version", { version }).getOne()
}

exports.winRate = async (champId, position, version) => {
    try {
        const winInfo = await ChampRate.createQueryBuilder()
            .where("champId = :champId", { champId })
            .andWhere("version = :version", { version })
            .andWhere("position = :position", { position })
            .select(["champ_rate.win", "champ_rate.pickCount"])
            .getOneOrFail()

        const winRate = (winInfo.win / winInfo.pickCount) * 100

        console.log(`승률: ${winRate.toFixed(2)}`)
    } catch (err) {
        logger.error(err, { message: ` - from winRate` })
    }
}
exports.banRate = async (champId, version) => {
    try {
        const gameInfo = await gameTotal(version)
        const banInfo = await ChampBan.createQueryBuilder()
            .where("champId = :champId", {
                champId,
            })
            .andWhere("version = :version", {
                version,
            })
            .select(["champ_ban.banCount"])
            .getOneOrFail()
        const banRate = (banInfo.banCount / gameInfo.gameCount) * 100
        console.log(`밴률: ${banRate.toFixed(2)}`)
    } catch (err) {
        logger.error(err, { message: ` - from winRate` })
    }
}
exports.pickRate = async (champId, position, version) => {
    try {
        const gameInfo = await gameTotal(version)
        const pickInfo = await ChampRate.createQueryBuilder()
            .where("champId = :champId", { champId })
            .andWhere("position = :position", { position })
            .andWhere("version = :version", { version })
            .select(["champ_rate.pickCount"])
            .getOneOrFail()
        const pickRate = (pickInfo.pickCount / gameInfo.gameCount) * 100
        console.log(`픽률: ${pickRate.toFixed(2)}`)
    } catch (err) {
        logger.error(err, { message: ` - from winRate` })
    }
}
exports.spellRate = async (champId, position, version) => {
    const spellInfo = await ChampSpell.createQueryBuilder()
        .where("champId = :champId", { champId })
        .andWhere("position = :position", { position })
        .andWhere("version = :version", { version })
        .select(["champ_spell.playCount playCount", "champ_spell.spell1", "champ_spell.spell2"])
        .addSelect("SUM(champ_spell.playCount) OVER(PARTITION BY champ_spell.champId) totalPlayCount")
        .orderBy("champ_spell.playCount", "DESC")
        .limit(1)
        .execute()

    const spellPickRate = (spellInfo[0].playCount / spellInfo[0].totalPlayCount) * 100
    console.log(`스펠 픽률: ${spellPickRate.toFixed(2)}`)

    try {
    } catch (err) {
        logger.error(err, { message: ` - from winRate` })
    }
}

exports.createOrIncreaseGameCount = async (version) => {
    try {
        const game = await GameInfo.findOneBy({ version })
        game
            ? await GameInfo.createQueryBuilder()
                  .update(GameInfo)
                  .set({ gameCount: () => "gameCount+1" })
                  .where("version = :version", { version: game.version })
                  .execute()
            : await GameInfo.createQueryBuilder().insert().values({ version, gameCount: 1 }).execute()
    } catch (err) {
        logger.error(err, { message: ` - from createOrIncreaseGameCount` })
    }
}

exports.createOrUpdateChampRate = async (champId, win, position, version) => {
    try {
        const existChamp = await ChampRate.createQueryBuilder()
            .where("champId = :champId", { champId })
            .andWhere("position = :position", { position })
            .andWhere("version = :version", { version })
            .getOne()

        if (win) {
            !existChamp
                ? await ChampRate.createQueryBuilder()
                      .insert()
                      .values({
                          champId,
                          win: 1,
                          position,
                          pickCount: 1,
                          version,
                      })
                      .execute()
                : await ChampRate.createQueryBuilder()
                      .update()
                      .set({
                          win: () => "win+1",
                          pickCount: () => "pickCount+1",
                      })
                      .where("champId = :champId", { champId })
                      .andWhere("position = :position", { position })
                      .andWhere("version = :version", { version })
                      .execute()
        } else if (!win) {
            !existChamp
                ? await ChampRate.createQueryBuilder()
                      .insert()
                      .values({
                          champId,
                          lose: 1,
                          position,
                          pickCount: 1,
                          version,
                      })
                      .execute()
                : await ChampRate.createQueryBuilder()
                      .update()
                      .set({
                          lose: () => "lose+1",
                          pickCount: () => "pickCount+1",
                      })
                      .where("champId = :champId", { champId })
                      .andWhere("position = :position", { position })
                      .andWhere("version = :version", { version })
                      .execute()
        }
    } catch (err) {
        logger.error(err, { message: ` - from createOrUpdateChampRate` })
    }
}
exports.createOrUpdateChampBan = async (champId, version) => {
    try {
        const existChamp = await ChampBan.createQueryBuilder()
            .where("champId = :champId", { champId })
            .andWhere("version = :version", { version })
            .getOne()

        !existChamp
            ? await ChampBan.createQueryBuilder().insert().values({ champId, banCount: 1, version }).execute()
            : await ChampBan.createQueryBuilder()
                  .update(ChampBan)
                  .set({ banCount: () => "banCount+1 " })
                  .where("champId = :champId", { champId })
                  .andWhere("version = :version", { version })
                  .execute()
    } catch (err) {
        logger.error(err, { message: ` - from createOrUpdateChampBan` })
    }
}

exports.createOrUpdateChampSpell = async (champId, spell1, spell2, position, version) => {
    try {
        const findSpell = await ChampSpell.createQueryBuilder()
            .where("champId = :champId", { champId })
            .andWhere("position = :position", { position })
            .andWhere("version = :version", { version })
            .andWhere(
                new Brackets((qb) => {
                    qb.where("spell1 = :spell1", { spell1 })
                        .andWhere("spell2 = :spell2", { spell2 })
                        .orWhere(
                            new Brackets((qb2) => {
                                qb2.where("spell1 = :spell2", {
                                    spell2,
                                }).andWhere("spell2 = :spell1", {
                                    spell1,
                                })
                            })
                        )
                })
            )
            .getOne()
        !findSpell
            ? await ChampSpell.createQueryBuilder()
                  .insert()
                  .values({
                      champId,
                      spell1,
                      spell2,
                      playCount: 1,
                      version,
                      position,
                  })
                  .execute()
            : await ChampSpell.createQueryBuilder()
                  .update()
                  .set({ playCount: () => "playCount+1" })
                  .where("champId = :champId", { champId })
                  .andWhere("position = :position", { position })
                  .andWhere("version = :version", { version })
                  .andWhere(
                      new Brackets((qb) => {
                          qb.where("spell1 = :spell1", { spell1 })
                              .andWhere("spell2 = :spell2", { spell2 })
                              .orWhere(
                                  new Brackets((qb2) => {
                                      qb2.where("spell1 = :spell2", {
                                          spell2,
                                      }).andWhere("spell2 = :spell1", {
                                          spell1,
                                      })
                                  })
                              )
                      })
                  )
                  .execute()
    } catch (err) {
        logger.error(err, { message: ` - from createOrUpdateChampSpell` })
    }
}

exports.matchIdList = async () => {
    try {
        return await MatchId.createQueryBuilder()
            .select()
            .where("champAnalyzed = :status", { status: 0 })
            .andWhere(
                new Brackets((qb) => {
                    qb.where("tier = :tier", { tier: "DIAMOND" }).orWhere("tier = :tier2", {
                        tier2: "PLATINUM",
                    })
                })
            )
            .orderBy("matchid.createdAt", "DESC")
            .limit(500)
            .getRawMany()
    } catch (err) {
        logger.error(err, { message: ` - from matchIdList` })
    }
}

exports.successAnalyzed = async (matchId) => {
    try {
        return await MatchId.createQueryBuilder().update().set({ champAnalyzed: 1 }).where("matchid.matchId = :matchId", { matchId }).execute()
    } catch (err) {
        logger.error(err, { message: ` - from successAnalyzed` })
    }
}

exports.dropAnalyzed = async (matchId) => {
    try {
        return await MatchId.createQueryBuilder().update().set({ champAnalyzed: 2 }).where("matchid.matchId = :matchId", { matchId }).execute()
    } catch (err) {
        logger.error(err, { message: ` - from dropAnalyzed` })
    }
}

exports.saveMatchIdVersion = async (matchId, version) => {
    try {
        return await MatchId.createQueryBuilder().update().set({ version }).where("matchid.matchId = :matchId", { matchId }).execute()
    } catch (err) {
        logger.error(err, { message: ` - from saveMatchIdVersion` })
    }
}
