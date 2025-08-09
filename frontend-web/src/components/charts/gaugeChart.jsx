import React, { useEffect, useRef } from "react";
import * as echarts from "echarts";

const HalfCircleGauge = ({ metricName, score }) => {
  const chartRef = useRef(null);
  const chart = useRef(null);
  const ro = useRef(null);

  useEffect(() => {
    if (!chartRef.current) return;
    chart.current = echarts.init(chartRef.current);

    // Resize on container changes
    ro.current = new ResizeObserver(() => {
      chart.current?.resize();
    });
    ro.current.observe(chartRef.current);

    return () => {
      ro.current?.disconnect();
      chart.current?.dispose();
    };
  }, []);

  useEffect(() => {
    if (!chart.current || score == null) return;

    const h = chartRef.current?.clientHeight || 30; // container height
    const ring = Math.max(6, Math.round(h * 0.1)); // ~10% thickness
    const thin = Math.max(3, Math.round(h * 0.02)); // thin highlight
    const valueFont = Math.max(14, Math.round(h * 0.35));
    const nameFont = Math.max(13, Math.round(h * 0.15));
    const pos = Math.max(0, score);
    const neg = Math.max(0, -score);
    const isPos = pos > 0;

    chart.current.setOption({
      tooltip: { show: false },
      series: [
        // Progress Line
        {
          type: "gauge",
          startAngle: 180, // start pi/2
          endAngle: 0, // end 0
          min: 0, // scores out of 100
          max: 100,
          center: ["50%", "50%"], // lower -> left center line, lower -> higher line
          radius: "100%", // size of the arc
          itemStyle: {
            color: new echarts.graphic.RadialGradient(0.5, 0.5, 0.45, [
              { offset: 0, color: "rgba(76,197,207,0.8)" },
              { offset: 1, color: "rgba(201,238,255,1)" },
            ]),
          },
          progress: { show: true, width: ring },
          pointer: { show: false },
          axisLine: { show: false },
          axisTick: { show: false },
          splitLine: { show: false },
          axisLabel: { show: false },
          anchor: { show: false },
          title: { show: false },
          detail: {
            valueAnimation: true,
            offsetCenter: [0, "5px"], // lower -> left center score metric , higher -> down center score metric
            fontSize: isPos ? valueFont : valueFont - 2,
            fontWeight: "bolder",
            formatter: `{value}\n{name|${metricName}}`,
            rich: {
              name: {
                fontSize: nameFont,
                lineHeight: Math.round(nameFont * 1.6),
                fontWeight: "normal",
                color: "#ffffff",
                padding: [5, 0, 0, 0],
                fontFamily: "Inter, sans-serif",
                letterSpacing: 1.7, // in px
              },
            },
            color: isPos ? "rgba(201,238,255,1)" : "rgba(212, 149, 144, 1)",
          },
          data: [{ value: score }],
        },
        {
          type: "gauge",
          clockwise: false,
          min: 0,
          max: 100,
          startAngle: 0,
          endAngle: 180, // <-- reversed
          center: ["50%", "50%"],
          radius: "101%",
          progress: { show: true, width: ring },
          pointer: { show: false },
          axisLine: { show: false },
          axisTick: { show: false },
          splitLine: { show: false },
          axisLabel: { show: false },
          itemStyle: {
            color: new echarts.graphic.RadialGradient(0.65, 0.4, 0.75, [
              { offset: 0, color: "rgba(120, 75, 72,0.8)" },
              { offset: 1, color: "rgba(199, 136, 131,1)" },
            ]),
          },
          detail: { show: false }, // label handled by the first series
          data: [{ value: neg }], // 0 if positive
          z: 2,
        },
        // Accent Line
        {
          type: "gauge",
          startAngle: 180,
          endAngle: 0,
          min: 0,
          max: 100,
          center: ["50%", "50%"], // lower -> left center thick line, lower -> higher thick line
          radius: "100%",
          itemStyle: { color: "#B3FCFC" },
          progress: { show: true, width: thin },
          pointer: { show: false },
          axisLine: { show: false },
          axisTick: { show: false },
          splitLine: { show: false },
          axisLabel: { show: false },
          detail: { show: false },
          data: [{ value: score }],
        },
      ],
    });
  }, [metricName, score]);

  return <div ref={chartRef} className="w-full h-full" />;
};

export default HalfCircleGauge;
