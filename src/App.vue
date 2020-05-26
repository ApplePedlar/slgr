<template lang="pug">
  .container
    .page-header
      h1 睡眠どうでしょう
        br
        small 〜 超簡単睡眠グラフ 〜
    .usage
      b-button(v-b-toggle.usage-collapse) ？
      b-collapse#usage-collapse
        b-card
          h4(v-b-toggle.usage-collapse-what) このサービスは何？
          b-collapse.usage-inner#usage-collapse-what 睡眠時間を記録したテキストを貼り付けると、グラフが表示されるサービスです。
            div まずは「サンプルデータ表示」ボタンを押してみてください。
            button.btn.btn-secondary.btn-sm(@click="showSample()") サンプルデータ表示
            div 黒い棒の部分が寝ていた時間帯です。右側にある数字と黒い棒はその日の合計睡眠時間を表しています。
          h4(v-b-toggle.usage-collapse-howto) 使い方
          b-collapse.usage-inner#usage-collapse-howto
            ol
              li 睡眠時間を記録した文字列をテキストボックスに貼り付けます。
              li グラフ表示ボタンを押してください。グラフが表示されます。
              li 先生やお医者さんなどに見せ、生活リズムの改善に役立てましょう。
          h4(v-b-toggle.usage-collapse-record) 睡眠時間の記録方法
          b-collapse.usage-inner#usage-collapse-record
            div 普段よく使っているメモ帳アプリなど、一番簡単に文章を書くことができるものに記録します。
            div 1日の睡眠時間は [日付(4桁)] [寝た時間(4桁)]-[起きた時間(4桁)] のように書きます。
            div 以下の例は5/22の21:30に寝て、翌朝07:20に起きた という意味になります。
            .sample 0522 2130-0720
            div 何度も寝たり起きたりした場合は、その分だけ時間帯を書いてください。
            div 以下の例は5/22の20:10に寝て、夜中の00:15に起き、01:30にまた寝て、翌朝07:20に起きた という意味になります。
            .sample 0522 2010-0015 0130-0720
            div 行の後ろにコメントを書くことができます。特別な行事や体調が悪い場合に書くと良いでしょう。
            .sample 0522 2000-0430 発熱38.4度
          h4(v-b-toggle.usage-collapse-newyear) 13時をまたぐ睡眠について
          b-collapse.usage-inner#usage-collapse-newyear
            div グラフの両端は13時です。13時をまたぐ睡眠の場合は12:59までと13:00からに分けてください。(改善検討中..)
            .sample
              | 0522 0030-0700 1200-1259<br>
              | 0523 1300-1330 2100-0600
            div この例の場合は睡眠時間が5/23の0:30〜7:00、12:00〜13:30、21:00〜翌6:00 となります。
          h4(v-b-toggle.usage-collapse-newyear) 年をまたぐ場合
          b-collapse.usage-inner#usage-collapse-newyear
            div 年をまたぐデータや昨年以前のデータの場合、日付は年を含めた8桁(20200522)で書いてください。8桁で書いた場合、それ以降は同じ年とみなされます。
            .sample
              | 20191230 0030-0900<br>
              | 1231 0030-0900<br>
              | 20200101 2300-0800<br>
              | 0101 2200-0800
          h4(v-b-toggle.usage-collapse-print) 印刷について
          b-collapse.usage-inner#usage-collapse-print
            div ブラウザの印刷機能を使うと、グラフ部分のみ印刷することができます。
    b-form-textarea.input(v-model="inputData" rows="15" placeholder="ここに睡眠記録を貼り付けてください。\n例)\n0521 2130-0630\n0522 2200-0700\n0523 1600-1730 2300-0530")
    button.btn.btn-primary.show-graph-button(@click="process()") 入力データをグラフ化
    pre.chart(ref="chart", :class="rendered() ? '' : 'dummy'") {{graphData}}
    .credit
      | Created by&nbsp;
      a(href="https://twitter.com/ApplePedlar") Naoya Hatayama (@ApplePedlar)
      br
      | src: &nbsp;
      a(href="https://github.com/ApplePedlar/slgr" target="_new") https://github.com/ApplePedlar/slgr

</template>

<script>

import moment from "moment"

const defaultGraphData = "(ここにグラフが表示されます)"

export default {
  data () {
    return {
      inputData: "",
      sampleText: "0501 1845-2130 0055-0620\n0502 2200-0720\n0503 2245-0745\n0504 2250-0745\n0505 2330-0730\n0506 2245-0730\n0507 2300-0550 旅行初日\n0508 1710-2020 0030-0800 旅行2日目\n0509 1805-2330 0030-0720\n0510 2000-0400 0620-0830 遠足\n0511 1640-1930 0100-0840\n0512 0030-0940 発熱37.8℃\n0513 2310-1000\n0514 2240-0530 0700-0755",
      graphData: defaultGraphData
    }
  },
  mounted () {
    // this.showSample()
  },
  methods: {
    showSample () {
      this.inputData = this.sampleText
      this.process()
    },

    process () {
      let dataArr = this.parse(this.inputData)
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
       *     ],
       *     "comment": String
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

        // date
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

        // time
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

        // comment
        let lastTimeStr = timeMatch[timeMatch.length - 1]
        let commentIndex = line.lastIndexOf(lastTimeStr) + lastTimeStr.length
        let comment = line.substring(commentIndex).trim()
        data.comment = comment

        dataArr.push(data)
      }
      console.log(dataArr)
      return dataArr
    },
    
    renderGraph (dataArr) {
      if (dataArr.length === 0) {
        this.graphData = defaultGraphData
        return
      }
      let preText = "               | 14  16  18  20  22  00  02  04  06  08  10  12 |\n"
      preText += "-------------------------------------------------------------------------------------------------\n"

      let lines = new Array(dataArr.length)
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

        lines[i] = s
      }

      let maxlen = lines.map(line => line.length).reduce((a, b) => Math.max(a, b))
      for (let i = 0; i < lines.length; i++) {
        let spaceCount = maxlen - lines[i].length + 1
        for (let j = 0; j < spaceCount; j++) {
          lines[i] += " "
        }
        lines[i] += "| " + dataArr[i].comment
      }

      this.graphData = preText + lines.join("\n")
    },
    rendered () {
      return this.graphData.length > 15
    }
  }
}
</script>

<style lang="sass">

.page-header
  font-family: 'UD デジタル 教科書体 N-B', 'ヒラギノ丸ゴ ProN'
  background-color: #a260bf
  color: white
  padding: 20px
  text-align: center
  h1
    font-size: 2rem

.usage
  margin: 20px
  h4
    color: #8030FF
    font-size: 1.3rem
  .usage-inner
    margin: 0 20px 20px
  .sample
    width: 300px
    margin: 20px
    border: 1px solid silver
    padding: 10px

textarea
  &::placeholder
    color: #CCCCCC !important

.show-graph-button
  margin: 5px 0 20px

pre.chart
  font-family: "Courier New", Consolas, monospace
  min-height: 300px
  min-width: 60rem
  &.dummy
    border: dotted 1px black
    min-width: 460px
    height: 300px
    text-align: center
    padding-top: 140px

.credit
  font-size: 0.8rem
  margin: 1rem 0



@media print
  .page-header, .usage, .input, button, .credit
    display: none !important
  pre.chart
    border: none

</style>
