import React from 'react';
import ReactECharts from 'echarts-for-react';

const RangeDopplerChart = ({ data }) => {
  const getOption = () => {
    if (!data || !data.ranges || !data.velocities || !data.spectrum) {
      return {
        title: { text: '等待数据...', left: 'center', textStyle: { color: '#8a97c7' } },
        backgroundColor: '#060b1c',
      };
    }

    return {
      backgroundColor: '#060b1c',
      title: {
        text: '距离-多普勒谱 (Range-Doppler)',
        textStyle: { color: '#a78bfa', fontSize: 16 },
        left: 'center',
      },
      tooltip: {
        position: 'top',
        backgroundColor: 'rgba(17, 26, 51, 0.9)',
        borderColor: '#253163',
        textStyle: { color: '#e6ecff' },
        formatter: (params) => {
          return `速度: ${params.value[0].toFixed(2)} m/s<br/>距离: ${params.value[1].toFixed(2)} m<br/>强度: ${params.value[2].toFixed(2)}`;
        },
      },
      grid: {
        left: '10%',
        right: '10%',
        bottom: '15%',
        top: '15%',
      },
      xAxis: {
        type: 'value',
        name: '速度 (m/s)',
        nameTextStyle: { color: '#8a97c7' },
        axisLine: { lineStyle: { color: '#253163' } },
        axisLabel: { color: '#8a97c7' },
        splitLine: { lineStyle: { color: '#253163', type: 'dashed' } },
      yAxis: {
        type: 'value',
        name: '距离 (m)',
        nameTextStyle: { color: '#8a97c7' },
        axisLine: { lineStyle: { color: '#253163' } },
        axisLabel: { color: '#8a97c7' },
        splitLine: { lineStyle: { color: '#253163', type: 'dashed' } },
      visualMap: {
        min: 0,
        max: Math.max(...data.spectrum.flat()),
        calculable: true,
        realtime: false,
        inRange: {
          color: ['#060c28', '#145ea8', '#22d3ee', '#4ade80', '#facc15', '#ef4444'],
        },
        textStyle: { color: '#8a97c7' },
        left: '5%',
        top: 'center',
      },
      series: [
        {
          name: '强度',
          type: 'heatmap',
          data: data.spectrum.flatMap((row, yi) =>
            row.map((val, xi) => [data.velocities[xi], data.ranges[yi], val])
          ),
          label: { show: false },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowColor: 'rgba(0, 0, 0, 0.5)',
            },
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

export default RangeDopplerChart;