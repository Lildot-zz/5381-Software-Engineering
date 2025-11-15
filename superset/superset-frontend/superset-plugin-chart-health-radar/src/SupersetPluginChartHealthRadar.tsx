/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import React, { useMemo } from 'react';
import { styled } from '@superset-ui/core';
import { SupersetPluginChartHealthRadarProps, ProjectTask } from './types';
// 导入 useAuth hook
import { useAuth } from '../../src/auth/AuthContext';

// --- Styled Components (无修改) ---
const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  padding: 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  color: white;
  overflow-y: auto;
`;

const Header = styled.div<{ fontSize: string; bold: boolean }>`
  font-size: ${props => props.fontSize === 'xl' ? '32px' : props.fontSize === 'l' ? '28px' : props.fontSize === 'm' ? '24px' : '20px'};
  font-weight: ${props => props.bold ? 'bold' : '600'};
  margin-bottom: 24px;
  color: white;
  text-align: center;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
`;

const RadarSection = styled.div`
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
`;

const RadarTitle = styled.h3`
  color: #333;
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 20px 0;
  text-align: center;
`;

const RadarContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;
  position: relative;
`;

const RadarCanvas = styled.svg`
  width: 100%;
  max-width: 400px;
  height: 300px;
`;

const MetricsSection = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
`;

const MetricCard = styled.div<{ color: string }>`
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  border-left: 4px solid ${props => props.color};
  transition: transform 0.2s, box-shadow 0.2s;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  }
`;

const CardLabel = styled.div`
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
  font-weight: 500;
`;

const CardValue = styled.div<{ color: string }>`
  font-size: 36px;
  font-weight: bold;
  color: ${props => props.color};
  margin-bottom: 4px;
`;

const CardStatus = styled.div<{ color: string }>`
  font-size: 12px;
  color: ${props => props.color};
  font-weight: 600;
  text-transform: uppercase;
`;

const KanbanSection = styled.div`
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
`;

const KanbanTitle = styled.h3`
  color: #333;
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 20px 0;
`;

const KanbanBoard = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const KanbanColumn = styled.div<{ bgColor: string }>`
  background: ${props => props.bgColor};
  border-radius: 8px;
  padding: 16px;
  min-height: 200px;
`;

const ColumnHeader = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const TaskCount = styled.span`
  background: rgba(255, 255, 255, 0.8);
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
`;

const TaskCard = styled.div`
  background: white;
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;

  &:hover {
    transform: translateX(4px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  }
`;

const TaskTitle = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: #333;
  margin-bottom: 6px;
`;

const TaskMeta = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
  color: #666;
`;

const TaskPriority = styled.span<{ priority: string }>`
  padding: 2px 6px;
  border-radius: 4px;
  background: ${props => 
    props.priority === 'high' ? '#fee' : 
    props.priority === 'medium' ? '#ffeaa7' : '#e0f7fa'};
  color: ${props => 
    props.priority === 'high' ? '#c00' : 
    props.priority === 'medium' ? '#d63031' : '#00695c'};
  font-weight: 600;
`;

const NoPermissionWrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  flex-grow: 1;
  background: #f0f2f5;
  color: #595959;
  font-size: 18px;
  border-radius: 8px;
`;

// --- 辅助函数 (无修改) ---
function getHealthColor(value: number, goodThreshold: number, warningThreshold: number): string {
  if (value >= goodThreshold) return '#52c41a';
  if (value >= warningThreshold) return '#faad14';
  return '#f5222d';
}

function getHealthStatus(value: number, goodThreshold: number, warningThreshold: number): string {
  if (value >= goodThreshold) return '健康';
  if (value >= warningThreshold) return '警告';
  return '风险';
}

function RadarChart({ data, goodThreshold, warningThreshold }: any) {
  // ... (RadarChart 组件内部实现无修改)
  const center = { x: 200, y: 150 };
  const maxRadius = 120;
  const levels = 5;

  const points = useMemo(() => {
    if (!data) return [];
    return data.map((metric: any, i: number) => {
      const angle = (Math.PI * 2 * i) / data.length - Math.PI / 2;
      const radius = (metric.value / 100) * maxRadius;
      return {
        x: center.x + radius * Math.cos(angle),
        y: center.y + radius * Math.sin(angle),
        angle,
        label: metric.label,
        value: metric.value,
      };
    });
  }, [data]);

  if (points.length === 0) return null;

  const polygonPath = points.map((p: any, i: number) => 
    `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
  ).join(' ') + ' Z';

  const gridLevels = Array.from({ length: levels }, (_, i) => {
    const radius = maxRadius * ((i + 1) / levels);
    const gridPoints = data.map((_: any, j: number) => {
      const angle = (Math.PI * 2 * j) / data.length - Math.PI / 2;
      return {
        x: center.x + radius * Math.cos(angle),
        y: center.y + radius * Math.sin(angle),
      };
    });
    const path = gridPoints.map((p, idx) => 
      `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
    ).join(' ') + ' Z';
    return path;
  });

  return (
    <RadarCanvas>
      {gridLevels.map((path, i) => (
        <path key={i} d={path} fill="none" stroke="#e0e0e0" strokeWidth="1" />
      ))}
      {points.map((p: any, i: number) => (
        <line
          key={`axis-${i}`}
          x1={center.x}
          y1={center.y}
          x2={center.x + maxRadius * Math.cos(p.angle)}
          y2={center.y + maxRadius * Math.sin(p.angle)}
          stroke="#ccc"
          strokeWidth="1"
        />
      ))}
      <path
        d={polygonPath}
        fill="rgba(102, 126, 234, 0.3)"
        stroke="#667eea"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      {points.map((p: any, i: number) => {
        const color = getHealthColor(p.value, goodThreshold, warningThreshold);
        return (
          <g key={`point-${i}`}>
            <circle cx={p.x} cy={p.y} r="6" fill={color} stroke="white" strokeWidth="2" />
            <text
              x={center.x + (maxRadius + 30) * Math.cos(p.angle)}
              y={center.y + (maxRadius + 30) * Math.sin(p.angle)}
              textAnchor="middle"
              fontSize="12"
              fill="#333"
              fontWeight="600"
            >
              {p.label}
            </text>
            <text
              x={center.x + (maxRadius + 30) * Math.cos(p.angle)}
              y={center.y + (maxRadius + 30) * Math.sin(p.angle) + 14}
              textAnchor="middle"
              fontSize="11"
              fill={color}
              fontWeight="bold"
            >
              {p.value}%
            </text>
          </g>
        );
      })}
    </RadarCanvas>
  );
}

// --- 主组件 ---
export default function SupersetPluginChartHealthRadar(props: SupersetPluginChartHealthRadarProps) {
  const {
    data,
    height,
    width,
    goodThreshold = 80,
    warningThreshold = 60,
    headerText = '项目管理看板',
    boldText = true,
    headerFontSize = 'xl',
    tasks = [],
  } = props;

  // --- 权限控制 ---
  const { user, hasRole, isLoading } = useAuth();
  const isManager = hasRole('Project_Manager');
  const isDeveloper = hasRole('Developer');
  const canView = isManager || isDeveloper;

  // --- 数据计算与过滤 ---
  const overallHealth = data && data.length > 0
    ? Math.round(data.reduce((sum, item) => sum + item.value, 0) / data.length)
    : 0;

  // 根据角色过滤可见的任务
  const visibleTasks = useMemo(() => {
    if (isManager) {
      return tasks; // 经理看到所有任务
    }
    if (isDeveloper && user) {
      // 开发者只看到分配给自己的任务
      // 假设 user.username 存储了任务分配人字段(task.assignee)对应的值
      return tasks.filter((t: ProjectTask) => t.assignee === user.username);
    }
    return []; // 其他角色看不到任何任务
  }, [tasks, isManager, isDeveloper, user]);

  const tasksByStatus = useMemo(() => {
    const grouped = {
      todo: visibleTasks.filter((t: ProjectTask) => t.status === 'todo'),
      inProgress: visibleTasks.filter((t: ProjectTask) => t.status === 'inProgress'),
      done: visibleTasks.filter((t: ProjectTask) => t.status === 'done'),
    };
    return grouped;
  }, [visibleTasks]);

  // --- 渲染逻辑 ---
  if (isLoading) {
    return (
      <Wrapper style={{ height, width }}>
        <NoPermissionWrapper>正在加载权限信息...</NoPermissionWrapper>
      </Wrapper>
    );
  }

  return (
    <Wrapper style={{ height, width }}>
      <Header fontSize={headerFontSize} bold={boldText}>
        {isManager ? `${headerText} (经理视图)` : headerText}
      </Header>

      {!canView ? (
        <NoPermissionWrapper>🚫 您没有权限查看此看板。</NoPermissionWrapper>
      ) : (
        <>
          <RadarSection>
            <RadarTitle>📊 项目健康度总览 (整体: {overallHealth}%)</RadarTitle>
            <RadarContainer>
              <RadarChart 
                data={data} 
                goodThreshold={goodThreshold} 
                warningThreshold={warningThreshold}
              />
            </RadarContainer>
          </RadarSection>

          <MetricsSection>
            {data.map((metric, index) => {
              const color = getHealthColor(metric.value, goodThreshold, warningThreshold);
              const status = getHealthStatus(metric.value, goodThreshold, warningThreshold);
              return (
                <MetricCard key={metric.name || index} color={color}>
                  <CardLabel>{metric.label || metric.name}</CardLabel>
                  <CardValue color={color}>{metric.value}%</CardValue>
                  <CardStatus color={color}>{status}</CardStatus>
                </MetricCard>
              );
            })}
          </MetricsSection>

          <KanbanSection>
            <KanbanTitle>📋 任务跟踪看板</KanbanTitle>
            <KanbanBoard>
              <KanbanColumn bgColor="#fff3e0">
                <ColumnHeader>
                  📝 待办 <TaskCount>{tasksByStatus.todo.length}</TaskCount>
                </ColumnHeader>
                {tasksByStatus.todo.map((task: ProjectTask, i: number) => (
                  <TaskCard key={i}>
                    <TaskTitle>{task.title}</TaskTitle>
                    <TaskMeta>
                      <TaskPriority priority={task.priority}>{task.priority}</TaskPriority>
                      <span>{task.assignee}</span>
                    </TaskMeta>
                  </TaskCard>
                ))}
              </KanbanColumn>

              <KanbanColumn bgColor="#e3f2fd">
                <ColumnHeader>
                  🚀 进行中 <TaskCount>{tasksByStatus.inProgress.length}</TaskCount>
                </ColumnHeader>
                {tasksByStatus.inProgress.map((task: ProjectTask, i: number) => (
                  <TaskCard key={i}>
                    <TaskTitle>{task.title}</TaskTitle>
                    <TaskMeta>
                      <TaskPriority priority={task.priority}>{task.priority}</TaskPriority>
                      <span>{task.assignee}</span>
                    </TaskMeta>
                  </TaskCard>
                ))}
              </KanbanColumn>

              <KanbanColumn bgColor="#e8f5e9">
                <ColumnHeader>
                  ✅ 已完成 <TaskCount>{tasksByStatus.done.length}</TaskCount>
                </ColumnHeader>
                {tasksByStatus.done.map((task: ProjectTask, i: number) => (
                  <TaskCard key={i}>
                    <TaskTitle>{task.title}</TaskTitle>
                    <TaskMeta>
                      <TaskPriority priority={task.priority}>{task.priority}</TaskPriority>
                      <span>{task.assignee}</span>
                    </TaskMeta>
                  </TaskCard>
                ))}
              </KanbanColumn>
            </KanbanBoard>
          </KanbanSection>
        </>
      )}
    </Wrapper>
  );
}