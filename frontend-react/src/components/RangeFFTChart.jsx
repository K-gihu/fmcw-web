import React from 'react';
import ReactECharts from 'echarts-for-react';

const RangeFFTChart = ({ data, targets }) => {
  const getOption = () => {
    if (!data || !data.ranges || !data.magnitudes) {
      return {
        title: { text: '等待数据...', left: 'center', textStyle: { color: '#8a97c7' } },
        backgroundColor: '#060b1c',
      };
    }

    const markPoints = targets
      .filter(t => t.R <= Math.max(...data.ranges))
      .map(t => ({
        name: `Target ${targets.indexOf(t) + 1}`,
        xAxis: t.R,
        yAxis: Math.max(...data.magnitudes) * 0.9,
        itemStyle: { color: '#f472b6' },
        label: { show: true, formatter: `T${targets.indexOf(t) + 1}`, color: '#fff' },
      }));

    return {
      backgroundColor: '#060b1c',
      title: {
        text: '距离频谱 (Range FFT)',
        textStyle: { color: '#22d3ee', fontSize: 16 },
        left: 'center',
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(17, 26, 51, 0.9)',
        borderColor: '#253163',
        textStyle: { color: '#e6ecff' },
      },
      grid: {
        left: '10%',
        right: '5%',
        bottom: '15%',
        top: '15%',
      },
      xAxis: {
        type: 'value',
        name: '距离 (m)',
        nameTextStyle: { color: '#8a97c7' },
        axisLine: { lineStyle: { color: '#253163' } },
        axisLabel: { color: '#8a97c7' },
        splitLine: { lineStyle: { color: '#253163', type: 'dashed' } },
      },
      yAxis: {
        type: 'value',
        name: '幅度',
        nameTextStyle: { color: '#8a97c7' },
        axisLine: { lineStyle: { color: '#253163' } },
        axisLabel: { color: '#8a97c7' },
        splitLine: { lineStyle: { color: '#253163', type: 'dashed' } },
      },
      series: [
        {
          name: '幅度',
          type: 'line',
          data: data.ranges.map((r, i) => [r, data.magnitudes[i]]),
          smooth: true,
          lineStyle: { color: '#22d3ee', width: 2 },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(34, 211, 238, 0.3)' },
                { offset: 1, color: 'rgba(34, 211, 238, 0)' },
              ],
            },
          },
          markPoint: {
            data: markPoints,
            symbol: 'pin',
            symbolSize: 40,
          },
        },
      ],
    };
  };

  return (
    <ReactECharts
      option={getOption()}
      style={{ height: '100%', width: '100%' }}
      opts={{ renderer: 'canvas' }}
    />
  );
};

export default RangeFFTChart;