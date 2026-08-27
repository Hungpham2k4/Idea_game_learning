/**
 * @file src/components/game/stages/GameStage.tsx
 * @description Chọn sân khấu phù hợp với engine của game.
 */
import React from 'react';
import GitStage from './GitStage';
import GridStage from './GridStage';
import SqlStage from './SqlStage';
import TerminalStage from './TerminalStage';
import TowerStage from './TowerStage';

interface Props {
    engine: string;
    runtime: string;
    state: any;
    frames: any[];
    config: any;
    onInsert?: (text: string) => void;
}

const GameStage: React.FC<Props> = ({ engine, runtime, state, frames, config, onInsert }) => {
    if (engine === 'sql') {
        return <SqlStage state={state} config={config} frames={frames} onInsert={onInsert} />;
    }
    if (engine === 'shell') {
        return <TerminalStage state={state} config={config} frames={frames} />;
    }
    if (engine === 'git') {
        return <GitStage state={state} config={config} frames={frames} />;
    }
    if (engine === 'script') {
        if (runtime === 'tower') {
            return <TowerStage state={state} frames={frames} config={config} />;
        }
        return <GridStage state={state} frames={frames} config={config} theme={runtime} />;
    }

    return (
        <div className="cq-panel grid flex-1 place-items-center p-8 text-sm text-cq-muted">
            Chưa có giao diện cho engine "{engine}".
        </div>
    );
};

export default GameStage;
