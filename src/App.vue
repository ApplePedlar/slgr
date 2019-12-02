<template lang="pug">
  div
    h1 SLGR - Sleep Graph
    .usage
      h3 使い方
      ol
        li 睡眠時間を記録した文字列をテキストボックスに貼り付けます。
        li グラフ表示ボタンを押します。
      
      h4 睡眠時間の記録方法
      div 適当なメモ帳アプリなどに記録してください。
      div 1日の睡眠時間は以下のように記録します。
      .sample 20191210 2230-0720
      div この例の場合は2019/12/10の22:30に寝て、翌朝07:20に起きた という意味になります。
      br
      div 何度も寝たり起きたりした場合は、その分だけ時間帯を書いてください。
      .sample 20191210 2010-0015 0130-0720
      div この例の場合は2019/12/10の20:10に寝て、夜中の00:15に起き、01:30にまた寝て、翌朝07:20に起きた という意味になります。
      br
      div 日付は8桁(20191210)または4桁(1210)のように書くことができます。8桁で書いた場合、それ以降は同じ年とみなされます。
      div まずは「サンプルデータ表示」ボタンを押してみてください。
    .form
      textarea(ref="dataInput")
      br
      button(@click="process()") 入力データをグラフ化
      button(@click="showSample()") サンプルデータ表示
    pre.chart(ref="chart") (ここにグラフが表示されます)
</template>

<script>

import moment from "moment"

export default {
  data () {
    return {
      sampleText: "20191225 1845-2130 0055-0620\n1226 2200-0720\n1227 2245-0745\n1228 2250-0745\n1229 2330-0730\n1230 2245-0730\n20200101 2300-0550\n0102 1710-2020 0030-0800\n0103 1805-2330 0030-0720\n0104 2000-0400 0620-0830\n0105 1640-1930 0100-0840\n0106 0030-0940\n0107 2310-1000\n0108 2240-0530 0700-0755"
    }
  },
  methods: {
    showSample () {
      this.$refs.dataInput.value = this.sampleText
      this.process()
    },

    process () {
      let dataArr = this.parse(this.$refs.dataInput.value)
      this.renderGraph(dataArr)
    },

    parse (input) {
      /**
       * [
       *   {
       *     "date": Date
       *     "times": [
       *       {
       *         "start": Date,
       *         "end": Date
       *       }
       *     ]
       *   }
       * ]
       */

      let dataArr = []
      let lines = input.split("\n")

      const datePattern = /^\s*(20[0-9]{2})?([0-1][0-9][0-3][0-9])/
      const timePattern = /[0-2][0-9][0-5][0-9]-[0-2][0-9][0-5][0-9]/g
      let currentYear = moment().year()

      for (let i = 0; i < lines.length; i++) {
        let data = {}
        let line = lines[i]
        let dateMatch = line.match(datePattern)
        if (!dateMatch) {
          continue
        }
        if (dateMatch[1]) {
          currentYear = dateMatch[1]
        }
        let yyyyMMDD = currentYear + dateMatch[2]
        data.date = moment(yyyyMMDD, "YYYYMMDD")
        data.times = []

        let timeMatch = line.match(timePattern)

        if (!timeMatch) {
          continue
        }

        for (let j = 0; j < timeMatch.length; j++) {
          let start = moment(yyyyMMDD + timeMatch[j].substring(0, 4), "YYYYMMDDHHmm")
          if (start.hour() < 13) {
            start = start.add(1, "days")
          }
          let end = moment(yyyyMMDD + timeMatch[j].substring(5, 9), "YYYYMMDDHHmm")
          if (end.hour() < 13) {
            end = end.add(1, "days")
          }
          let time = { start, end }
          data.times.push(time)
        }

        dataArr.push(data)
      }
      return dataArr
    },
    
    renderGraph (dataArr) {
      let preText = "               | 14  16  18  20  22  00  02  04  06  08  10  12 |\n"
      preText += "-------------------------------------------------------------------------------------------------\n"

      for (let i = 0; i < dataArr.length; i++) {
        let data = dataArr[i]
        let s = data.date.format("YYYY/MM/DD(ddd)") + "|"

        let timeRange = "                                                "// 48 spaces
        let totalMinutes = 0

        for (let j = 0; j < data.times.length; j++) {
          // 13時が0、13:30が1、14時が2.. になるように計算
          let start = data.times[j].start
          let startHour = start.hour()
          let startMinute = start.minute()
          let startTimeIndex = Math.round(((startHour + startMinute / 60 + 24 - 13) * 2) % 48)

          let end = data.times[j].end
          let endHour = end.hour()
          let endMinute = end.minute()
          let endTimeIndex = Math.round(((endHour + endMinute / 60 + 24 - 13) * 2) % 48)

          for (let k = startTimeIndex; k < endTimeIndex; k++) {
            timeRange = timeRange.slice(0, k) + "■" + timeRange.slice(k + 1)
          }

          if (j == 0 && startTimeIndex >= 6) {
            timeRange = timeRange.slice(0, startTimeIndex - 6)
              + start.format("HH:mm") + " "
              + timeRange.slice(startTimeIndex)
          }

          if (j == data.times.length - 1 && endTimeIndex < 43) {
            timeRange = timeRange.slice(0, endTimeIndex)
              + " " + end.format("HH:mm")
              + timeRange.slice(endTimeIndex + 6)
          }

          totalMinutes += end.diff(start, "minute")
        }
        
        s += timeRange

        s += "|"
        
        if (totalMinutes < 600) {
          s += " "
        }

        s += Number(totalMinutes / 60).toFixed(1)
        s += " "
        for (let j = 0; j < Math.round(totalMinutes / 60 * 2); j++) {
          s += "■"
        }

        s += "\n"
        preText += s
      }

      this.$refs.chart.innerHTML = preText
    }
  }
}
</script>

<style lang="sass">
textarea
  width: 500px
  height: 300px

pre
  font-family: "Courier New", Consolas, monospace

.usage
  margin: 20px
  .sample
    width: 300px
    margin: 20px
    border: 1px solid silver
    padding: 10px

button
  margin-right: 10px

@media print
  h1, .usage, .form, 
    display: none

</style>
