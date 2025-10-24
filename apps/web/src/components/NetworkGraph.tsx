'use client';

import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface NodeDatum extends d3.SimulationNodeDatum {
  id: string;
}

export default function NetworkGraph() {
  const ref = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    // ✅ Guard window access
    if (typeof window === "undefined" || !ref.current) return;

    const svg = d3.select(ref.current);
    const width = parseInt(svg.style('width'), 10) || window.innerWidth;
    const height = parseInt(svg.style('height'), 10) || window.innerHeight;

    const nodes: NodeDatum[] = [
      { id: 'wincvex-dc' },
      { id: 'wincvex-host-b' },
      { id: 'wincvex-host-c' },
    ];
    const links = [
      { source: 'wincvex-dc', target: 'wincvex-host-b' },
      { source: 'wincvex-dc', target: 'wincvex-host-c' },
    ];

    const simulation = d3
      .forceSimulation<NodeDatum>(nodes)
      .force(
        'link',
        d3.forceLink<NodeDatum, any>(links).id((d: any) => d.id).distance(150),
      )
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2));

    svg.selectAll('*').remove();

    const link = svg
      .append('g')
      .attr('stroke', '#888')
      .attr('stroke-width', 2)
      .selectAll('line')
      .data(links)
      .enter()
      .append('line');

    const node = svg
      .append('g')
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5)
      .selectAll('circle')
      .data(nodes)
      .enter()
      .append('circle')
      .attr('r', 18)
      .attr('fill', (_d, i) => ['#00C1D5', '#0F4C81', '#2D9CDB'][i])
      .call(
        d3.drag<SVGCircleElement, NodeDatum>()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on('drag', (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          }),
      );

    const labels = svg
      .append('g')
      .selectAll('text')
      .data(nodes)
      .enter()
      .append('text')
      .text((d) => d.id)
      .attr('font-size', 10)
      .attr('fill', '#fff');

    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => (d.source as any).x)
        .attr('y1', (d: any) => (d.source as any).y)
        .attr('x2', (d: any) => (d.target as any).x)
        .attr('y2', (d: any) => (d.target as any).y);
      node.attr('cx', (d) => d.x as number).attr('cy', (d) => d.y as number);
      labels
        .attr('x', (d) => (d.x as number) - 30)
        .attr('y', (d) => (d.y as number) + 30);
    });

    return () => {
      simulation.stop();
    };
  }, []);

  return <svg ref={ref} className="w-full h-full" />;
}
