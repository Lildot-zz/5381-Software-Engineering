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
import React, { useRef, useState, useEffect, useMemo } from 'react';
import { styled, SupersetTheme } from '@superset-ui/core';
import { CollabForcedirectedProps, CollabForcedirectedStylesProps } from './types';
import { LinkDatum } from './utils/types';
import { DEFAULT_DISTANCE_SCALE, DEFAULT_CLUSTER_DISTANCE, MIN_NODE_RADIUS } from './utils/constants';
import { getLinkId } from './utils/linkHelpers';
import { screenToGraph } from './utils/domHelpers';
import { Tooltip, Controls, RecordsTable } from './components';
import {
  useForceSimulation,
  usePanZoom,
  useTimeFilter,
  useNodeInteraction,
} from './hooks';
import { useAuth } from '../../src/auth/AuthContext';

// --- Styled Components (无修改) ---

const Styles = styled.div<CollabForcedirectedStylesProps>`
  position: relative;
  background-color: ${({ theme }) => theme.colors.secondary.light2};
  padding: ${({ theme }) => theme.gridUnit * 4}px;
  border-radius: ${({ theme }) => theme.gridUnit * 2}px;
  height: ${({ height }) => height}px;
  width: ${({ width }) => width}px;
  display: flex;
  flex-direction: column;

  h3 {
    margin-top: 0;
    margin-bottom: ${({ theme }) => theme.gridUnit * 3}px;
    font-size: ${({ theme, headerFontSize }) =>
      theme.typography.sizes[headerFontSize]}px;
    font-weight: ${({ theme, boldText }) =>
      theme.typography.weights[boldText ? 'bold' : 'normal']};
    flex-shrink: 0;
  }
`;

const GraphContainer = styled.div`
  border: 1px solid #ccc;
  flex-shrink: 0;
`;

const BottomControlsContainer = styled.div`
  flex-shrink: 0;
  padding-top: ${({ theme }) => theme.gridUnit * 2}px;
  overflow-y: auto;
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

// --- 主组件 ---

export default function CollabForcedirected(props: CollabForcedirectedProps) {
  // 【关键修正】: 从 props 中解构出 theme 对象
  const { nodes: rawNodes = [], links: rawLinks = [], height, width, headerText, theme } = props as any;

  const { hasRole, isLoading } = useAuth();
  
  const isManager = hasRole('Project_Manager');
  const isDeveloper = hasRole('Developer');
  const canView = isManager || isDeveloper;

  const nodes = useMemo(() => rawNodes, [rawNodes]);
  const links = useMemo(() => rawLinks, [rawLinks]);
  
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const initialCenterDoneRef = useRef(false);
  const lastManualClickTimeRef = useRef<number>(0);
  
  const [hoveredLink, setHoveredLink] = useState<LinkDatum | null>(null);
  const [expandedLinkId, setExpandedLinkId] = useState<string | null>(null);
  
  const [distanceScale, setDistanceScale] = useState<number>(DEFAULT_DISTANCE_SCALE);
  const [clusterDistance, setClusterDistance] = useState<number>(DEFAULT_CLUSTER_DISTANCE);

  const timeFilter = useTimeFilter(links, 'month');
  const nodeInteraction = useNodeInteraction(containerRef);
  const panZoom = usePanZoom(svgRef, width, height);
  
  const headerRef = useRef<HTMLHeadingElement>(null);
  const controlsRef = useRef<HTMLDivElement>(null);
  const [graphHeight, setGraphHeight] = useState(height * 0.8);

  useEffect(() => {
    if (isLoading || !canView || !theme) return; // 增加对 theme 的检查
    
    const headerHeight = headerRef.current?.offsetHeight || 0;
    const controlsHeight = controlsRef.current?.offsetHeight || 0;
    
    // 【关键修正】: 使用从 props 传入的 theme 对象
    const padding = theme.gridUnit * 4 * 2;
    const headerMargin = theme.gridUnit * 3;
    
    const availableHeight = height - padding - headerHeight - headerMargin - controlsHeight;
    setGraphHeight(Math.max(200, availableHeight));
  // 【关键修正】: 将 theme 添加到依赖项数组
  }, [height, isManager, isLoading, canView, theme]);

  const simulation = useForceSimulation(nodes, links, {
    width: width - (theme?.gridUnit * 8 || 32) - 2, // 减去左右 padding 和边框
    height: graphHeight,
    distanceScale,
    clusterDistance,
    windowRange: timeFilter.windowRange,
  });

  useEffect(() => {
    if (simulation.simNodes.length > 0 && !initialCenterDoneRef.current) {
      panZoom.fitViewToNodes(simulation.simNodes);
      initialCenterDoneRef.current = true;
    }
  }, [simulation.simNodes, panZoom]);

  useEffect(() => {
    if (simulation.simNodes.length > 0 && initialCenterDoneRef.current) {
      panZoom.fitViewToNodes(simulation.simNodes);
    }
  }, [timeFilter.windowRange, simulation.simNodes, panZoom]);

  const handleSvgMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
      if (e.target === svgRef.current) {
        panZoom.onSvgMouseDown(e);
        nodeInteraction.clearSelection();
        setExpandedLinkId(null);
      }
    };

    const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
      e.stopPropagation();
      nodeInteraction.onNodeMouseDown(e, nodeId);
    };

    const handleNodeClick = (e: React.MouseEvent, nodeId: string) => {
      e.stopPropagation();
      const now = Date.now();
      if (now - lastManualClickTimeRef.current < 50) return;
      
      const result = nodeInteraction.handleNodeClick(nodeId);
      if (!result.handled) return;
      
      if (result.selected) {
        setExpandedLinkId(null);
        panZoom.centerOnNodeIds([nodeId], simulation.simNodes);
      } else {
        setExpandedLinkId(null);
        panZoom.restoreInitialView();
      }
    };

    const handleLinkClick = (e: React.MouseEvent, link: LinkDatum) => {
      e.stopPropagation();
      const linkId = getLinkId(link);
      
      if (expandedLinkId === linkId) {
        setExpandedLinkId(null);
        panZoom.restoreInitialView();
      } else {
        setExpandedLinkId(linkId);
        nodeInteraction.clearSelection();
        const sourceId = typeof link.source === 'string' ? link.source : (link.source as any)?.id;
        const targetId = typeof link.target === 'string' ? link.target : (link.target as any)?.id;
        if (sourceId && targetId) {
          panZoom.centerOnNodeIds([sourceId, targetId], simulation.simNodes);
        }
      }
    };

    useEffect(() => {
      const handleWindowMouseMove = (e: MouseEvent) => {
        if (panZoom.isPanning()) {
          panZoom.handleWindowMouseMove(e);
        }
        const draggedNodeId = nodeInteraction.getDraggingNodeId();
        if (draggedNodeId) {
          nodeInteraction.markDragMoved();
          const svg = svgRef.current;
          if (svg) {
            const rect = svg.getBoundingClientRect();
            const graphPos = screenToGraph(e.clientX, e.clientY, rect, panZoom.viewTransform);
            simulation.fixNodePosition(draggedNodeId, graphPos.x, graphPos.y);
          }
        }
      };

      const handleWindowMouseUp = () => {
        const draggedNodeId = nodeInteraction.getDraggingNodeId();
        const dragMoved = nodeInteraction.wasDragMoved();
        
        panZoom.handleWindowMouseUp();
        
        if (draggedNodeId && dragMoved) {
          simulation.releaseNodePosition(draggedNodeId);
        } else if (draggedNodeId && !dragMoved) {
          const result = nodeInteraction.handleNodeClick(draggedNodeId);
          if (result.handled) {
            lastManualClickTimeRef.current = Date.now();
            if (result.selected) {
              setExpandedLinkId(null);
              panZoom.centerOnNodeIds([draggedNodeId], simulation.simNodes);
            } else {
              setExpandedLinkId(null);
              panZoom.restoreInitialView();
            }
          }
        }
        
        nodeInteraction.completeDrag();
      };

      window.addEventListener('mousemove', handleWindowMouseMove);
      window.addEventListener('mouseup', handleWindowMouseUp);

      return () => {
        window.removeEventListener('mousemove', handleWindowMouseMove);
        window.removeEventListener('mouseup', handleWindowMouseUp);
      };
    }, [panZoom, nodeInteraction, simulation]);

  if (isLoading) {
    return (
      <Styles {...props}>
        <NoPermissionWrapper>正在加载权限信息...</NoPermissionWrapper>
      </Styles>
    );
  }

  const { simNodes, simLinks } = simulation;
  const { selectedNodeId, dragActiveId, tooltip } = nodeInteraction;
  const { viewTransform } = panZoom;

  return (
    <Styles
      ref={containerRef}
      boldText={props.boldText}
      headerFontSize={props.headerFontSize}
      height={height}
      width={width}
    >
      {headerText && <h3 ref={headerRef}>{isManager ? `${headerText} (经理视图)` : headerText}</h3>}
      
      {canView ? (
        <>
          <GraphContainer style={{ height: `${graphHeight}px` }}>
            <svg
              ref={svgRef}
              width="100%"
              height="100%"
              style={{ cursor: panZoom.isPanning() ? 'grabbing' : 'grab' }}
              onMouseDown={handleSvgMouseDown}
            >
              <g transform={`translate(${viewTransform.x}, ${viewTransform.y}) scale(${viewTransform.k})`}>
                {/* SVG 内容渲染 */}
                {simLinks.map((ln) => {
              const linkId = getLinkId(ln);
              const isExpanded = linkId === expandedLinkId;
              const isHovered = hoveredLink === ln;
              const isAdjacent =
                selectedNodeId &&
                ((typeof ln.source === 'string' ? ln.source : (ln.source as any)?.id) === selectedNodeId ||
                  (typeof ln.target === 'string' ? ln.target : (ln.target as any)?.id) === selectedNodeId);

              const sourceId = typeof ln.source === 'string' ? ln.source : (ln.source as any)?.id;
              const targetId = typeof ln.target === 'string' ? ln.target : (ln.target as any)?.id;
              const s = simNodes.find((n) => n.id === sourceId);
              const t = simNodes.find((n) => n.id === targetId);
              if (!s || !t) return null;

              const shouldShowGrayLine = !isAdjacent || !selectedNodeId;
              const weight = ln.weight || 1;
              const strokeWidth = isExpanded || isAdjacent ? Math.max(2, weight / 2) : Math.max(1, weight / 4);
              const opacity = isExpanded || isHovered || isAdjacent ? 0.9 : selectedNodeId ? 0.05 : 0.3;

              return (
                <g key={linkId}>
                  {shouldShowGrayLine && (
                    <>
                      <line
                        x1={s.x} y1={s.y} x2={t.x} y2={t.y}
                        stroke="#999" strokeWidth={strokeWidth} opacity={opacity}
                        style={{ pointerEvents: 'none' }}
                      />
                      <line
                        x1={s.x} y1={s.y} x2={t.x} y2={t.y}
                        stroke="transparent" strokeWidth={Math.max(10, strokeWidth * 4)}
                        onClick={(e) => handleLinkClick(e, ln)}
                        onMouseEnter={() => setHoveredLink(ln)}
                        onMouseLeave={() => setHoveredLink(null)}
                        style={{ cursor: 'pointer', pointerEvents: 'stroke' }}
                      />
                    </>
                  )}
                </g>
              );
            })}

            {(() => {
              if (!expandedLinkId) return null;
              const activeLink = simLinks.find((ln) => getLinkId(ln) === expandedLinkId);
              if (!activeLink) return null;
              const sourceId = typeof activeLink.source === 'string' ? activeLink.source : (activeLink.source as any)?.id;
              const targetId = typeof activeLink.target === 'string' ? activeLink.target : (activeLink.target as any)?.id;
              const s = simNodes.find((n) => n.id === sourceId);
              const t = simNodes.find((n) => n.id === targetId);
              if (!s || !t) return null;
              const types = (activeLink as any).types || {};
              const typeEntries = Object.entries(types);
              return (
                <g>
                  {typeEntries.map(([k, v], idx) => {
                    const visualStroke = Math.max(1, (v as number) / 1.5);
                    return (
                      <g key={`expanded-${k}`}>
                        <line
                          x1={s.x} y1={s.y} x2={t.x} y2={t.y}
                          stroke={ k === 'commits' ? 'green' : k === 'reviews' ? 'blue' : k === 'assigns' ? 'orange' : 'gray' }
                          strokeWidth={visualStroke} opacity={0.9} strokeDasharray={k === 'assigns' ? '4 2' : undefined}
                          transform={`translate(0, ${idx * 3 - (typeEntries.length * 3) / 2})`}
                          style={{ pointerEvents: 'none' }}
                        />
                        <line
                          x1={s.x} y1={s.y} x2={t.x} y2={t.y}
                          stroke="transparent" strokeWidth={Math.max(10, visualStroke * 6)}
                          transform={`translate(0, ${idx * 3 - (typeEntries.length * 3) / 2})`}
                          onClick={(e) => handleLinkClick(e, activeLink)}
                          style={{ cursor: 'pointer', pointerEvents: 'stroke' }}
                        />
                      </g>
                    );
                  })}
                </g>
              );
            })()}

            {selectedNodeId && simLinks.map((ln) => {
              const sourceId = typeof ln.source === 'string' ? ln.source : (ln.source as any)?.id;
              const targetId = typeof ln.target === 'string' ? ln.target : (ln.target as any)?.id;
              const isAdjacent = (sourceId === selectedNodeId || targetId === selectedNodeId);
              if (!isAdjacent) return null;
              const s = simNodes.find((n) => n.id === sourceId);
              const t = simNodes.find((n) => n.id === targetId);
              if (!s || !t) return null;
              const types = (ln as any).types || {};
              const typeEntries = Object.entries(types);
              const linkId = getLinkId(ln);
              return (
                <g key={`adjacent-${linkId}`}>
                  {typeEntries.map(([k, v], idx) => {
                    const visualStroke = Math.max(1, (v as number) / 1.5);
                    return (
                      <g key={`adjacent-${linkId}-${k}`}>
                        <line
                          x1={s.x} y1={s.y} x2={t.x} y2={t.y}
                          stroke={ k === 'commits' ? 'green' : k === 'reviews' ? 'blue' : k === 'assigns' ? 'orange' : 'gray' }
                          strokeWidth={visualStroke} opacity={0.9} strokeDasharray={k === 'assigns' ? '4 2' : undefined}
                          transform={`translate(0, ${idx * 3 - (typeEntries.length * 3) / 2})`}
                          style={{ pointerEvents: 'none' }}
                        />
                        <line
                          x1={s.x} y1={s.y} x2={t.x} y2={t.y}
                          stroke="transparent" strokeWidth={Math.max(10, visualStroke * 6)}
                          transform={`translate(0, ${idx * 3 - (typeEntries.length * 3) / 2})`}
                          onClick={(e) => handleLinkClick(e, ln)}
                          style={{ cursor: 'pointer', pointerEvents: 'stroke' }}
                        />
                      </g>
                    );
                  })}
                </g>
              );
            })}

            {simNodes.map((n) => {
              const isAdjacent = selectedNodeId && simLinks.some((ln) => {
                const sourceId = typeof ln.source === 'string' ? ln.source : (ln.source as any)?.id;
                const targetId = typeof ln.target === 'string' ? ln.target : (ln.target as any)?.id;
                return (
                  (sourceId === selectedNodeId && targetId === n.id) ||
                  (targetId === selectedNodeId && sourceId === n.id)
                );
              });
              const isSelected = n.id === selectedNodeId;
              const nodeOpacity = isSelected || isAdjacent || !selectedNodeId ? 1 : 0.2;
              
              return (
                <g
                  key={`node-${n.id}`}
                  transform={`translate(${n.x}, ${n.y})`}
                  onMouseDown={(e) => handleNodeMouseDown(e, n.id)}
                  onClick={(e) => handleNodeClick(e, n.id)}
                  onMouseEnter={(e) => nodeInteraction.onNodeMouseEnter(e, n)}
                  onMouseMove={nodeInteraction.onNodeMouseMove}
                  onMouseLeave={nodeInteraction.onNodeMouseLeave}
                  style={{ cursor: dragActiveId === n.id ? 'grabbing' : 'grab' }}
                  opacity={nodeOpacity}
                >
                  <circle 
                    r={n.size || MIN_NODE_RADIUS} 
                    fill="#3182bd"
                    stroke={isSelected ? '#ff7f0e' : '#fff'}
                    strokeWidth={isSelected ? 2 : 1.5}
                  />
                  <text x={10} y={4} fontSize={10} fill="#333" style={{ pointerEvents: 'none' }}>
                    {String(n.id)}
                  </text>
                </g>
              );
            })}
              </g>
            </svg>
          </GraphContainer>
          
          <Tooltip
            visible={tooltip.visible}
            x={tooltip.x}
            y={tooltip.y}
            content={tooltip.content}
          />

          {isManager && (
            <BottomControlsContainer ref={controlsRef}>
              <Controls
                distanceScale={distanceScale}
                onDistanceScaleChange={setDistanceScale}
                clusterDistance={clusterDistance}
                onClusterDistanceChange={setClusterDistance}
                timeUnit={timeFilter.timeUnit}
                onTimeUnitChange={timeFilter.setTimeUnit}
                timeBuckets={timeFilter.timeBuckets}
                sliderIndex={timeFilter.sliderIndex}
                onSliderIndexChange={timeFilter.setSliderIndex}
                windowRange={timeFilter.windowRange}
              />
              <RecordsTable
                selectedNodeId={selectedNodeId}
                expandedLinkId={expandedLinkId}
                links={simLinks}
              />
            </BottomControlsContainer>
          )}
        </>
      ) : (
        <NoPermissionWrapper>🚫 您没有权限查看此图表。</NoPermissionWrapper>
      )}
    </Styles>
  );
}