const { sleep } = require("../../timer/timer")
const logger = require("../../log")
const axios = require("axios")

const {
    matchIdList,
    saveMatchIdVersion,
    dropAnalyzed,
    createOrIncreaseGameCount,
    createOrUpdateChampRate,
    createOrUpdateChampBan,
    createOrUpdateChampSpell,
    successAnalyzed,
} = require("./champ.common.service")

const { rateDataToService, spellDataToService } = require("./champ.service/data.save.controller")

let key = 0
let status
exports.startChampDataSave = async () => {
    try {
        const data = await matchIdList()
        logger.info(data.length, {
            message: "- 승/밴/픽, 스펠, 포지션 데이터분석 matchId 개수",
        })
        while (key !== data.length) {
            if (status !== undefined) {
                status = undefined
                continue
            }
            const riotResponse = await requestRiotAPI(data[key]?.matchid_matchId)
            if (riotResponse === "next" || riotResponse === "drop") {
                // console.log("비정상 matchData skip")
                key++
                continue
            } else if (riotResponse === "expire") {
                key = data.length
                continue
            }
            const { participants } = riotResponse.matchData.info
            const { version } = riotResponse
            await createOrIncreaseGameCount(version)
            for (let v of participants) {
                const champId = v.championId
                const win = v.win
                const spell1 = v.summoner1Id
                const spell2 = v.summoner2Id
                const position = v.teamPosition

                await createOrUpdateChampRate(champId, win, position, version)
                await createOrUpdateChampSpell(champId, spell1, spell2, position, version)
            }
            //ban
            const { teams } = riotResponse.matchData.info
            const champList = []
            for (let t of teams) {
                const { bans } = t
                for (let b of bans) {
                    const champId = b.championId
                    if (champId === -1) {
                        continue
                    }
                    await createOrUpdateChampBan(champId, version)
                    champList.push(champId)
                }
            }
            key++
            await successAnalyzed(data[key]?.matchid_matchId)
        }
        key = 0
        logger.info("승/밴/픽, 스펠, 포지션 데이터분석완료")
        return
    } catch (err) {
        logger.error(err, { message: "- from startChampDataSave" })
        return err
    }
}

//라이엇 매치데이터 요청
async function requestRiotAPI(matchId) {
    try {
        const matchDataApiUrl = `https://asia.api.riotgames.com/lol/match/v5/matches/${matchId}?api_key=${process.env.KEY}`
        const response = await axios.get(matchDataApiUrl)

        const matchData = response.data

        if (matchData.info.gameMode !== "CLASSIC" && matchData.info.queueId !== 420) {
            await dropAnalyzed(matchId)
            // console.log("게임속성 부적절")
            return "next"
        }

        const version = matchData.info.gameVersion.substring(0, 5)
        await saveMatchIdVersion(matchId, version)

        return { matchData, version }
    } catch (err) {
        if (!err.response) {
            logger.error(err, { message: key + " 번째 부터 오류!" })
            return key++
        }
        if (err.response.status === 429) {
            logger.error(err, { message: key + " 번째 부터 오류!" })
            await sleep(125)
            return
        } else if (err.response.status === 403) {
            logger.error(err, { message: key + "api키 갱신 필요!" })
            return "expire"
        } else {
            logger.error(err, {
                message: `- from requestRiotAPI matchId: ${matchId} `,
            })
            status = err.response.status
            return "drop"
        }
    }
}

exports.startChampCalculation = async () => {
    try {
        logger.info("champ 승/밴/포지션 픽/스펠 승률 변환 시작")
        await positionCalculation()
        await winPickRateCalculation()
        await banRateCalculation()
        await spellCaculation()
        logger.info("champ 승/밴/포지션 픽/스펠 승률 변환 완료")
    } catch (err) {
        logger.error(err, { message: "- from startChampCalculation" })
    }
}

exports.saveChampDataToServiceDB = async () => {
    try {
        await rateDataToService()
        await spellDataToService()
    } catch (err) {
        logger.error(err, { message: "- from saveToServiceDB" })
    }
}
