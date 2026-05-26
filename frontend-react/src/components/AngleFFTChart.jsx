import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';

const AngleFFTChart = ({ data, targets }) => {
  const option = useMemo(() => {
    if (!data || !data.angles || !data.magnitudes) {
      return {
        title: { text: '等待数据...', left: 'center', textStyle: { color: '#8a97c7' } },
        backgroundColor: '#060b1c',
      };
    }

    const markLines = targets.map(t => ({
      name: `Target ${targets.indexOf(t) + 1}`,
      xAxis: t.th,
      lineStyle: { color: '#f472b6', type: 'dashed' },
      label: { show: true, formatter: `T${targets.indexOf(t) + 1}`, color: '#fff' },
    }));

    return {
      backgroundColor: '#060b1c',
      title: {
        text: '角度频谱 (Angle FFT)',
        textStyle: { color: '#a78bfa', fontSize: 16 },
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
        name: '角度 (°)',
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
          data: data.angles.map((a, i) => [a, data.magnitudes[i]]),
          smooth: true,
          lineStyle: { color: '#a78bfa', width: 2 },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(167, 139, 250, 0.3)' },
                { offset: 1, color: 'rgba(167, 139, 250, 0)' },
              ],
            },
          },
          markLine: {
            data: markLines,
          },
        },
      ],
    };
  }, [data, targets]);

  return (
    <ReactECharts
      option={option}
      style={{ height: '100%', width: '100%' }}
      opts={{ renderer: 'canvas' }}
    />
  );
};

export default React.memo(AngleFFTChart);