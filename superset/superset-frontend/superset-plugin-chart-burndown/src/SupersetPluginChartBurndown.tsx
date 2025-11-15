import React from 'react';
import { ChartProps } from './types';
import { useAuth } from '../../src/auth/AuthContext';

const SupersetPluginChartBurndown: React.FC<ChartProps> = ({
  data = [],
  width = 600,
  height = 400,
}) => {
  const { hasRole, isLoading } = useAuth();
  
  // 【关键修正】: 将 'ProjectManager' 修改为 'Project_Manager' 以匹配模拟数据
  const isManager = hasRole('Project_Manager');
  const canView = hasRole('Project_Manager') || hasRole('Developer');

  if (isLoading) {
    return <div style={{ width, height, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>正在加载权限信息...</div>;
  }
  
  if (!canView) {
    return (
      <div style={{ width, height, display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#f0f2f5', color: '#595959', fontSize: '18px' }}>
        🚫 您没有权限查看此图表。
      </div>
    );
  }

  if (!data || data.length === 0) return <div>No data</div>;

  // --- 数据预处理 (无修改) ---
  const xs = data.map(d => new Date(d.ds).getTime());
  const ys = data.map(d => Number(d.remaining ?? d.remaining_hours ?? 0));

  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = 0;
  const maxY = Math.max(...ys);

  const margin = { left: 50, right: 50, top: 50, bottom: 80 };

  // --- 延长线计算 (无修改) ---
  let projectionPath = '';
  let projectedDateStr = '';
  let xProj = 0;
  let xProjScaled = 0;

  if (ys.length >= 2) {
    const x1 = xs[xs.length - 2];
    const y1 = ys[xs.length - 2];
    const x2 = xs[xs.length - 1];
    const y2 = ys[xs.length - 1];
    const k = (y2 - y1) / (x2 - x1);
    if (k < 0 && y2 > 0) {
      xProj = x2 - y2 / k;
      xProjScaled =
        margin.left +
        ((xProj - minX) / (Math.max(maxX, xProj) - minX || 1)) *
          (width - margin.left - margin.right);
      projectionPath = `M ${
        margin.left +
        ((x2 - minX) / (Math.max(maxX, xProj) - minX || 1)) *
          (width - margin.left - margin.right)
      } ${
        height -
        margin.bottom -
        ((y2 - minY) / (maxY - minY || 1)) * (height - margin.top - margin.bottom)
      } L ${xProjScaled} ${height - margin.bottom}`;

      const projDate = new Date(xProj);
      projDate.setHours(0, 0, 0, 0);
      if (xProj > projDate.getTime()) projDate.setDate(projDate.getDate() + 1);
      projectedDateStr = `${projDate.getFullYear()}-${(projDate.getMonth() + 1)
        .toString()
        .padStart(2, '0')}-${projDate.getDate().toString().padStart(2, '0')}`;
    }
  }

  const rightmostX = projectionPath ? Math.max(maxX, xProj) : maxX;
  const xScale = (x: number) =>
    margin.left + ((x - minX) / (rightmostX - minX || 1)) * (width - margin.left - margin.right);
  const yScale = (y: number) =>
    height - margin.bottom - ((y - minY) / (maxY - minY || 1)) * (height - margin.top - margin.bottom);

  const xAxisEnd = xScale(rightmostX);

  const keyDates: number[] = [];
  const firstDate = xs[0];
  const lastDate = xs[xs.length - 1];
  keyDates.push(firstDate);

  const minGap = 2 * 24 * 60 * 60 * 1000;
  let d = new Date(firstDate);
  d.setHours(0, 0, 0, 0);

  while (d.getTime() < lastDate) {
    d.setDate(d.getDate() + 1);
    const t = d.getTime();
    const day = d.getDate();
    if ((day % 5 === 0 || day % 10 === 0) &&
        keyDates.every(k => Math.abs(k - t) > minGap) &&
        lastDate - t > minGap) {
      keyDates.push(t);
    }
  }

  if (keyDates.every(k => Math.abs(k - lastDate) > 0)) keyDates.push(lastDate);

  let projTime: number | null = null;
  if (projectionPath) {
    const projDate = new Date(xProj);
    projDate.setHours(0, 0, 0, 0);
    projTime = projDate.getTime();
  }

  keyDates.sort((a, b) => a - b);

  const actualPath = xs
    .map((x, i) => `${i === 0 ? 'M' : 'L'} ${xScale(x)} ${yScale(ys[i])}`)
    .join(' ');

  const idealPath = `M ${xScale(xs[0])} ${yScale(ys[0])} L ${xScale(xs[xs.length - 1])} ${yScale(0)}`;

  const yTicks = 5;
  const yStep = maxY / yTicks;

  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp);
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${d.getFullYear()}-${month}-${day}`;
  };

  const [tooltip, setTooltip] = React.useState<{ visible: boolean; x: number; y: number; content: string }>({ visible: false, x: 0, y: 0, content: '' });
  const [hoverLine, setHoverLine] = React.useState<{ visible: boolean; x: number; y: number }>({ visible: false, x: 0, y: 0 });

  const tooltipWidth = 150;
  const tooltipHeight = 40;

  return (
    <svg
      width={width}
      height={height}
      role="img"
      aria-label="Burndown chart"
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        setHoverLine({ visible: true, x: mouseX, y: mouseY });

        const distances = xs.map((x, i) => Math.abs(xScale(x) - mouseX));
        const minIndex = distances.indexOf(Math.min(...distances));
        const nearestX = xs[minIndex];
        const nearestY = ys[minIndex];

        let tooltipX = xScale(nearestX) + 10;
        let tooltipY = yScale(nearestY) - tooltipHeight - 5;
        if (tooltipX + tooltipWidth > width) tooltipX = xScale(nearestX) - tooltipWidth - 10;
        if (tooltipY < margin.top) tooltipY = yScale(nearestY) + 5;

        setTooltip({
          visible: true,
          x: tooltipX,
          y: tooltipY,
          content: `Date: ${formatDate(nearestX)}\nRemaining Work / Issues: ${nearestY}`,
        });
      }}
      onMouseLeave={() => {
        setHoverLine({ visible: false, x: 0, y: 0 });
        setTooltip({ visible: false, x: 0, y: 0, content: '' });
      }}
    >
      <rect x={0} y={0} width={width} height={height} fill="#fff" />
      {Array.from({ length: yTicks + 1 }).map((_, i) => {
        const yVal = yStep * i;
        const yPos = yScale(yVal);
        return (
          <g key={`y-grid-${i}`}>
            <line x1={margin.left} y1={yPos} x2={xAxisEnd} y2={yPos} stroke="#eee" strokeWidth={1} />
            <text x={margin.left - 8} y={yPos + 4} fontSize="10" textAnchor="end" fill="#555">
              {Math.round(yVal)}
            </text>
          </g>
        );
      })}
      {keyDates.map((x) => (
        <g key={`x-grid-${x}`}>
          <line x1={xScale(x)} y1={yScale(minY)} x2={xScale(x)} y2={margin.top} stroke="#f3f3f3" strokeWidth={1} />
          <text
            x={xScale(x)}
            y={height - margin.bottom + 15}
            fontSize="10"
            textAnchor="end"
            transform={`rotate(-45, ${xScale(x)}, ${height - margin.bottom + 15})`}
            fill="#555"
          >
            {formatDate(x)}
          </text>
        </g>
      ))}
      <line x1={margin.left} y1={yScale(minY)} x2={xAxisEnd} y2={yScale(minY)} stroke="#000" strokeWidth={1.2} />
      <line x1={margin.left} y1={yScale(minY)} x2={margin.left} y2={margin.top} stroke="#000" strokeWidth={1.2} />
      <path d={idealPath} stroke="#ff7f0e" strokeWidth={2} strokeDasharray="5,5" fill="none" />
      <circle cx={xScale(xs[xs.length - 1])} cy={yScale(0)} r={2} fill="#ff7f0e" stroke="#ff7f0e" strokeWidth={1.5} />
      <path d={actualPath} stroke="#1f77b4" strokeWidth={2} fill="none" />
      
      {isManager && projectionPath && (
        <g>
          <path d={projectionPath} stroke="#1f77b4" strokeWidth={2} strokeDasharray="4,4" fill="none" />
          <text
            x={xProjScaled}
            y={height - margin.bottom + 15}
            fontSize="10"
            fontWeight="bold"
            textAnchor="middle"
            fill="#ff0000"
            transform={`rotate(-45, ${xProjScaled}, ${height - margin.bottom + 15})`}
          >
            {projectedDateStr}
          </text>
        </g>
      )}
      {xs.map((x, i) => (
        <circle key={i} cx={xScale(x)} cy={yScale(ys[i])} r={3} fill="#1f77b4" />
      ))}
      {isManager && projectionPath && projTime !== null && (
        <circle
          cx={xScale(projTime)}
          cy={yScale(0)}
          r={2}
          fill="#ff0000"
          stroke="#d62728"
          strokeWidth={1.5}
        />
      )}
      {hoverLine.visible && (
        <g>
          <line x1={hoverLine.x} y1={margin.top} x2={hoverLine.x} y2={height - margin.bottom} stroke="#aaa" strokeWidth={1} strokeDasharray="4,4" />
          <line x1={margin.left} y1={hoverLine.y} x2={width - margin.right} y2={hoverLine.y} stroke="#aaa" strokeWidth={1} strokeDasharray="4,4" />
        </g>
      )}
      {tooltip.visible && (
        <foreignObject x={tooltip.x} y={tooltip.y} width={tooltipWidth} height={tooltipHeight + 20}>
          <div
            style={{
              background: 'rgba(0,0,0,0.75)',
              color: '#fff',
              padding: '6px 8px',
              borderRadius: 4,
              fontSize: 12,
              boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
              whiteSpace: 'pre-line',
              pointerEvents: 'none',
            }}
          >
            {tooltip.content}
          </div>
        </foreignObject>
      )}
      <g transform={`translate(${width - 150}, ${margin.top})`}>
        <rect width={10} height={10} fill="#1f77b4" />
        <text x={15} y={9} fontSize="10" fill="#333">Actual</text>
        <rect y={15} width={10} height={2} fill="#ff7f0e" />
        <text x={15} y={20} fontSize="10" fill="#333">Ideal</text>
        {isManager && (
          <>
            <rect y={30} width={10} height={2} fill="#d62728" />
            <text x={15} y={35} fontSize="10" fill="#333">Projection</text>
          </>
        )}
      </g>
      <text x={width / 2} y={height - 10} fontSize="12" textAnchor="middle" fill="#333">Date</text>
      <text transform={`rotate(-90)`} x={-height / 2} y={15} fontSize="12" textAnchor="middle" fill="#333">Remaining Work / Issues</text>
    </svg>
  );
};

export default SupersetPluginChartBurndown;