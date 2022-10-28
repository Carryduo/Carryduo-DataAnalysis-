const { dataSource } = require("../../orm")
const { Brackets } = require("typeorm")

const ChampInfo = dataSource.getRepository("champinfo")
const ChampSpell = dataSource.getRepository("champspell")
const MatchId = dataSource.getRepository("matchid")

const { dataSource_service } = require("../../service.orm")
const ChampService = dataSource_service.getRepository("CHAMP")
const ChampSpellService = dataSource_service.getRepository("CHAMPSPELL")
const ChampSkill = dataSource_service.getRepository("CHAMPSKILL")

exports.matchIdList = async () => {
    return await MatchId.createQueryBuilder()
        .select()
        .where(
            new Brackets((qb) => {
                qb.where("rateAnalyzed = :result", { result: 0 })
                    .andWhere("spellAnalyzed = :result", { result: 0 })
                    .andWhere("banAnalyzed = :result", { result: 0 })
                    .andWhere("positionAnalyzed = :result", { result: 0 })
            })
        )
        .andWhere(
            new Brackets((qb) => {
                qb.where("tier = :tier", { tier: "DIAMOND" }).orWhere("tier = :tier2", {
                    tier2: "PLATINUM",
                })
            })
        )
        .limit(500)
        .getRawMany()
}

exports.getChampList = async () => {
    return ChampInfo.createQueryBuilder("champ").getRawMany()
}

exports.getMatchIdCnt = async () => {
    return await MatchId.createQueryBuilder()
        .where("rateAnalyzed = :result", { result: 1 })
        .getCount()
}

exports.getVersion = async (champId, version) => {
    return await ChampInfo.createQueryBuilder()
        .where("champId = :champId", { champId })
        .andWhere("version = :version", { version })
        .getOne()
}

exports.successAnalyzed = async (matchId, option) => {
    return await MatchId.createQueryBuilder()
        .update()
        .set(option.set)
        .where("matchid.matchId = :matchId", { matchId })
        .execute()
}

exports.dropAnalyzed = async (matchId, option) => {
    return await MatchId.createQueryBuilder()
        .update()
        .set({ rateAnalyzed: 2, banAnalyzed: 2, positionAnalyzed: 2, spellAnalyzed: 2 })
        .where("matchid.matchId = :matchId", { matchId })
        .execute()
}

exports.findSpellData = async () => {
    return await ChampSpell.createQueryBuilder().getRawMany()
}

//챔피언 게임 수 합산해서 가져오기
exports.spellTotalCnt = async (champId) => {
    return await ChampSpell.createQueryBuilder()
        .where("champId = :champId", { champId })
        .select("SUM(sampleNum)", "total")
        .getRawOne()
}

// ==========================================================================================//
//서비스 DB 저장 관련 쿼리
exports.ServiceSaveSpell = async (champId, spell1, spell2, pickRate, sampleNum) => {
    return ChampSpellService.createQueryBuilder()
        .insert()
        .values({ champId, spell1, spell2, pick_rate: pickRate, sample_num: sampleNum })
        .execute()
}

exports.ServiceUpdateChampSpellInfo = async (champId, spell1, spell2, pickRate, sampleNum) => {
    return ChampSpellService.createQueryBuilder()
        .update(ChampSpellService)
        .set({ pick_rate: pickRate, sample_num: sampleNum })
        .where("champId = :champId", { champId })
        .andWhere(
            new Brackets((qb) => {
                qb.where("spell1 = :spell1", { spell1 })
                    .andWhere("spell2 = :spell2", { spell2 })
                    .orWhere(
                        new Brackets((qb2) => {
                            qb2.where("spell1 = :spell2", { spell2 }).andWhere("spell2 = :spell1", {
                                spell1,
                            })
                        })
                    )
            })
        )
        .execute()
}

exports.ServicefindSpellInfoData = async (champId, spell1, spell2) => {
    return ChampSpellService.createQueryBuilder()
        .where("champId = :champId", { champId })
        .andWhere(
            new Brackets((qb) => {
                qb.where("spell1 = :spell1", { spell1 })
                    .andWhere("spell2 = :spell2", { spell2 })
                    .orWhere(
                        new Brackets((qb2) => {
                            qb2.where("spell1 = :spell2", { spell2 }).andWhere("spell2 = :spell1", {
                                spell1,
                            })
                        })
                    )
            })
        )
        .getRawOne()
}

exports.ServicePosition = async (champId, topRate, jungleRate, midRate, adRate, supportRate) => {
    return ChampService.createQueryBuilder()
        .update(ChampService)
        .set({
            top_rate: topRate,
            jungle_rate: jungleRate,
            mid_rate: midRate,
            ad_rate: adRate,
            support_rate: supportRate,
        })
        .where("champId = :champId", { champId })
        .execute()
}

exports.ServiceSaveRate = async (champId, winRate, pickRate, banRate) => {
    return ChampService.createQueryBuilder()
        .update(ChampService)
        .set({
            win_rate: winRate,
            pick_rate: pickRate,
            ban_rate: banRate,
        })
        .where("champId = :champId", { champId })
        .execute()
}

exports.targetChampionInfoSave = async (data) => {
    return ChampService.createQueryBuilder()
        .insert()
        .values({
            id: data.championId,
            champNameEn: data.championNameEn,
            champNameKo: data.championNameKo,
            champMainImg: data.championMainImg,
            champImg: data.championImg,
        })
        .execute()
}

exports.targetChampionSkillInfoSave = async (
    championId,
    qSkillInfo,
    wSkillInfo,
    eSkillInfo,
    rSkillInfo,
    passiveInfo
) => {
    await ChampSkill.createQueryBuilder()
        .insert()
        .values({
            champId: championId,
            skillId: qSkillInfo.id,
            skillName: qSkillInfo.name,
            skillDesc: qSkillInfo.desc,
            skillToolTip: qSkillInfo.tooltip,
            skillImg: qSkillInfo.image,
        })
        .execute()

    await ChampSkill.createQueryBuilder()
        .insert()
        .values({
            champId: championId,
            skillId: wSkillInfo.id,
            skillName: wSkillInfo.name,
            skillDesc: wSkillInfo.desc,
            skillToolTip: wSkillInfo.tooltip,
            skillImg: wSkillInfo.image,
        })
        .execute()

    await ChampSkill.createQueryBuilder()
        .insert()
        .values({
            champId: championId,
            skillId: eSkillInfo.id,
            skillName: eSkillInfo.name,
            skillDesc: eSkillInfo.desc,
            skillToolTip: eSkillInfo.tooltip,
            skillImg: eSkillInfo.image,
        })
        .execute()

    await ChampSkill.createQueryBuilder()
        .insert()
        .values({
            champId: championId,
            skillId: rSkillInfo.id,
            skillName: rSkillInfo.name,
            skillDesc: rSkillInfo.desc,
            skillToolTip: rSkillInfo.tooltip,
            skillImg: rSkillInfo.image,
        })
        .execute()

    await ChampSkill.createQueryBuilder()
        .insert()
        .values({
            champId: championId,
            skillId: passiveInfo.id,
            skillName: passiveInfo.name,
            skillDesc: passiveInfo.desc,
            skillImg: passiveInfo.image,
        })
        .execute()
}

exports.getTooltip = async () => {
    return await ChampSkill.createQueryBuilder().select().getMany()
}

exports.editToolTip = async (champId, skillToolTip, skillDesc) => {
    try {
        await ChampSkill.createQueryBuilder()
            .update()
            .set({ skillToolTip, skillDesc })
            .where("champId = :champId", { champId })
            .execute()
    } catch (error) {
        console.log(error)
        return "fail"
    }
}
