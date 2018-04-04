const SMSClient = require('@alicloud/sms-sdk')
const { Observable } = require('rxjs')
const request = require('request-promise')

const logger = require('./log')

const config = require('./config')
const { aliyunAccessKeyId, aliyunSecretAccessKey, signName, templateCode, aqicnToken, users } = config
const smsClient = new SMSClient({ accessKeyId: aliyunAccessKeyId, secretAccessKey: aliyunSecretAccessKey })

let DEBUG = true

Observable.from(users)
  .map((item, idx) => ({ ...item, idx }))
  .delayWhen(i => Observable.interval(2000 * i.idx))
  .map(async user => {
    const { name, cityEn, phone, city } = user
    const aqiRes = await request({
      uri: `https://api.waqi.info/feed/${cityEn}/`,
      qs: {
        token: aqicnToken
      },
      json: true
    })
    return { name, phone, city, aqi: aqiRes.data.aqi }
  })
  .flatMap(i => Observable.fromPromise(i))
  .map(i => {
    if (i.aqi <= 50) {
      i.aqiLevel = '优，空气质量令人满意，基本无空气污染。各类人群可正常活动'
      i.aqiLevel = '优'
    } else if (i.aqi <= 100) {
      i.aqiLevel = '良，空气质量可接受，但某些污染物可能对极少数异常敏感人群健康有较弱影响。极少数异常敏感人群应减少户外活动'
      i.aqiLevel = '良'
    } else if (i.aqi <= 150) {
      i.aqiLevel = '轻度污染，易感人群症状有轻度加剧，健康人群出现刺激症状。儿童、老年人及心脏病、呼吸系统疾病患者应减少长时间、高强度的户外锻炼'
      i.aqiLevel = '轻度污染'
    } else if (i.aqi <= 200) {
      i.aqiLevel = '中度污染，进一步加剧易感人群症状，可能对健康人群心脏、呼吸系统有影响。儿童、老年人及心脏病、呼吸系统疾病患者避免长时间、高强度的户外锻炼，一般人群适量减少户外运动'
      i.aqiLevel = '中度污染'
    } else if (i.aqi <= 300) {
      i.aqiLevel = '重度污染，心脏病和肺病患者症状显著加剧，运动耐受力降低，健康人群普遍出现症状。儿童、老年人及心脏病、肺病患者应停留在室内，停止户外运动，一般人群减少户外运动'
      i.aqiLevel = '重度污染'
    } else {
      i.aqiLevel = '严重污染，健康人群运动耐受力降低，有明显强烈症状，提前出现某些疾病。儿童、老年人和病人应停留在室内，避免体力消耗，一般人群避免户外活动'
      i.aqiLevel = '严重污染'
    }
    return i
  })
  .map(async i => {
    let code
    if (!DEBUG) {
      let { Code } = await smsClient.sendSMS({
        PhoneNumbers: i.phone,
        SignName: signName,
        TemplateCode: templateCode,
        TemplateParam: JSON.stringify({ name: i.name, localtion: i.city, aqi: i.aqi, aqi_level: i.aqiLevel })
      })
      code = Code
    }
    return { name: i.name, phone: i.phone, success: DEBUG ? 'debug' : code == 'OK' }
  })
  .flatMap(i => Observable.fromPromise(i))
  .subscribe(i => {
    logger.info(JSON.stringify(i))
  })