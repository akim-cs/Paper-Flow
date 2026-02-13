/**
 * Original React Flow demo flow for practice
 * Can be removed later
 */

'use client'; // Since React Flow uses hooks

import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

const initialNodes = [
  { id: '1', type: 'input', position: { x: 100, y: 50 }, data: { label: 'Start' } },
  { id: '2', position: { x: 100, y: 150 }, data: { label: 'Process A' } },
  { id: '3', position: { x: 100, y: 250 }, data: { label: 'Process B' } },
  { id: '4', type: 'output', position: { x: 100, y: 350 }, data: { label: 'End' } },
];

const initialEdges = [
  { id: 'e1-2', source: '1', target: '2', markerEnd: { type: MarkerType.ArrowClosed } },
  { id: 'e2-3', source: '2', target: '3', markerEnd: { type: MarkerType.ArrowClosed } },
  { id: 'e3-4', source: '3', target: '4', markerEnd: { type: MarkerType.ArrowClosed } },
];

const MyFlow = () => {
  // onNodesChange is callback function to handle clicking, dragging, selecting
  // Pass to ReactFlow as prop
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Handler to store newly connected edges in state
  const onConnect = (connection) => {

    // addEdge takes a new edge and previous edges
    // Returns new edges array with edge added in
    // connection is object React Flow passes in with source, target, and type
    setEdges((prev) =>
      addEdge(
        { ...connection, markerEnd: { type: MarkerType.ArrowClosed } },
        prev
      )
    );
  };

  return (
    <div className="h-[80vh] w-full rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        deleteKeyCode={['Backspace', 'Delete']}
        fitView
        className="rounded-xl"
      >
        <Background gap={16} size={1} />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
};

export default MyFlow;
