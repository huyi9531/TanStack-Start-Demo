import { createFileRoute } from '@tanstack/react-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Engine } from 'tetris-engine'

import type {
  TetrisEngineCell,
  TetrisEngineShapeName,
  TetrisEngineState,
} from 'tetris-engine'

type GameMetrics = {
  level: number
  lines: number
  pieces: number
  score: number
}

const BOARD_WIDTH = 10
const BOARD_HEIGHT = 20
const HIGH_SCORE_KEY = 'tanstack-start-tetris-high-score'
const PREVIEW_SIZE = 5

const GAME_STATUS = {
  init: 0,
  work: 1,
  pause: 2,
  over: 3,
} as const

const SHAPE_NAMES: Array<TetrisEngineShapeName> = [
  'IShape',
  'JShape',
  'LShape',
  'OShape',
  'SShape',
  'TShape',
  'ZShape',
]

const SHAPE_COLORS: Record<TetrisEngineShapeName, string> = {
  IShape: 'bg-cyan-300 shadow-cyan-300/35',
  JShape: 'bg-blue-400 shadow-blue-400/35',
  LShape: 'bg-orange-300 shadow-orange-300/35',
  OShape: 'bg-yellow-300 shadow-yellow-300/35',
  SShape: 'bg-emerald-300 shadow-emerald-300/35',
  TShape: 'bg-fuchsia-300 shadow-fuchsia-300/35',
  ZShape: 'bg-rose-400 shadow-rose-400/35',
}

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [{ title: '俄罗斯方块小游戏' }],
  }),
  component: TetrisGame,
})

function TetrisGame() {
  const engineRef = useRef<Engine | null>(null)
  const renderHandleRef = useRef<(state: TetrisEngineState) => void>(() => {})
  const [gameState, setGameState] = useState(createEmptyGameState)
  const [bestScore, setBestScore] = useState(0)
  const metrics = useMemo(
    () => calculateMetrics(gameState.statistic),
    [gameState.statistic],
  )
  const dropMs = getDropInterval(metrics.level)
  const controlsDisabled = gameState.gameStatus !== GAME_STATUS.work

  const syncEngineState = useCallback(() => {
    const engine = engineRef.current

    if (!engine) {
      return
    }

    setGameState(cloneGameState(engine.state))
  }, [])

  const createEngine = useCallback((startImmediately = false) => {
    const engine = new Engine(
      BOARD_WIDTH,
      BOARD_HEIGHT,
      (state: TetrisEngineState) => renderHandleRef.current(state),
    )

    engineRef.current = engine

    if (startImmediately) {
      engine.start()
      revealActiveShape(engine)
    }

    setGameState(cloneGameState(engine.state))
  }, [])

  const toggleGame = useCallback(() => {
    const engine = engineRef.current

    if (!engine) {
      return
    }

    if (engine.state.gameStatus === GAME_STATUS.over) {
      createEngine(true)
      return
    }

    if (engine.state.gameStatus === GAME_STATUS.work) {
      engine.pause()
      syncEngineState()
      return
    }

    engine.start()
    revealActiveShape(engine)
    syncEngineState()
  }, [createEngine, syncEngineState])

  const restartGame = useCallback(() => {
    createEngine(true)
  }, [createEngine])

  const moveLeft = useCallback(() => {
    engineRef.current?.moveLeft()
  }, [])

  const moveRight = useCallback(() => {
    engineRef.current?.moveRight()
  }, [])

  const rotate = useCallback(() => {
    engineRef.current?.rotate()
  }, [])

  const rotateBack = useCallback(() => {
    engineRef.current?.rotateBack()
  }, [])

  const hardDrop = useCallback(() => {
    const engine = engineRef.current

    if (!engine || engine.state.gameStatus !== GAME_STATUS.work) {
      return
    }

    const startPieceCount = engine.state.statistic.countShapesFalled

    for (let step = 0; step < BOARD_HEIGHT + PREVIEW_SIZE; step += 1) {
      engine.moveDown()
      const latestState = cloneGameState(engine.state)

      if (
        latestState.gameStatus === GAME_STATUS.over ||
        latestState.statistic.countShapesFalled !== startPieceCount
      ) {
        break
      }
    }

    const settledState = cloneGameState(engine.state)

    if (settledState.gameStatus === GAME_STATUS.work) {
      revealActiveShape(engine)
    }

    syncEngineState()
  }, [syncEngineState])

  const advanceGameTick = useCallback(() => {
    const engine = engineRef.current

    if (!engine || engine.state.gameStatus !== GAME_STATUS.work) {
      return
    }

    const startPieceCount = engine.state.statistic.countShapesFalled

    engine.moveDown()
    const latestState = cloneGameState(engine.state)

    if (
      latestState.gameStatus === GAME_STATUS.work &&
      latestState.statistic.countShapesFalled !== startPieceCount
    ) {
      revealActiveShape(engine)
    }

    syncEngineState()
  }, [syncEngineState])

  useEffect(() => {
    renderHandleRef.current = (state) => setGameState(cloneGameState(state))
    createEngine()

    return () => {
      engineRef.current = null
    }
  }, [createEngine])

  useEffect(() => {
    try {
      const storedScore = window.localStorage.getItem(HIGH_SCORE_KEY)

      if (!storedScore) {
        return
      }

      const parsedScore = Number.parseInt(storedScore, 10)

      if (Number.isFinite(parsedScore)) {
        setBestScore(parsedScore)
      }
    } catch (error) {
      console.warn('读取俄罗斯方块最高分失败', {
        key: HIGH_SCORE_KEY,
        error,
      })
    }
  }, [])

  useEffect(() => {
    if (metrics.score <= bestScore) {
      return
    }

    setBestScore(metrics.score)

    try {
      window.localStorage.setItem(HIGH_SCORE_KEY, String(metrics.score))
    } catch (error) {
      console.warn('保存俄罗斯方块最高分失败', {
        key: HIGH_SCORE_KEY,
        score: metrics.score,
        error,
      })
    }
  }, [bestScore, metrics.score])

  useEffect(() => {
    if (gameState.gameStatus !== GAME_STATUS.work) {
      return
    }

    const timer = window.setInterval(() => {
      advanceGameTick()
    }, dropMs)

    return () => window.clearInterval(timer)
  }, [advanceGameTick, dropMs, gameState.gameStatus])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const key = event.key.toLowerCase()

      if (key === 'arrowleft' || key === 'a') {
        event.preventDefault()
        moveLeft()
        return
      }

      if (key === 'arrowright' || key === 'd') {
        event.preventDefault()
        moveRight()
        return
      }

      if (key === 'arrowdown' || key === 's') {
        event.preventDefault()
        advanceGameTick()
        return
      }

      if (key === 'arrowup' || key === 'w' || key === 'x') {
        event.preventDefault()
        rotate()
        return
      }

      if (key === 'z') {
        event.preventDefault()
        rotateBack()
        return
      }

      if (event.key === ' ') {
        event.preventDefault()
        hardDrop()
        return
      }

      if (key === 'enter' || key === 'p') {
        event.preventDefault()
        toggleGame()
        return
      }

      if (key === 'r') {
        event.preventDefault()
        restartGame()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    advanceGameTick,
    hardDrop,
    moveLeft,
    moveRight,
    restartGame,
    rotate,
    rotateBack,
    toggleGame,
  ])

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-4 text-zinc-100 sm:px-6 lg:px-8">
      <section className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-6xl items-center gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-4">
          <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-yellow-200">
                Block Arcade
              </p>
              <h1 className="mt-2 text-4xl font-black text-white sm:text-5xl">
                俄罗斯方块小游戏
              </h1>
            </div>
            <div className={getStatusClassName(gameState.gameStatus)}>
              {getStatusLabel(gameState.gameStatus)}
            </div>
          </header>

          <div className="relative mx-auto w-fit rounded-lg border border-white/10 bg-zinc-900 p-2 shadow-2xl shadow-black/50">
            <div
              aria-label="俄罗斯方块游戏棋盘"
              className="grid gap-[3px] rounded-md bg-zinc-950 p-2"
              role="img"
              style={{
                aspectRatio: `${BOARD_WIDTH} / ${BOARD_HEIGHT}`,
                gridTemplateColumns: `repeat(${BOARD_WIDTH}, minmax(0, 1fr))`,
                gridTemplateRows: `repeat(${BOARD_HEIGHT}, minmax(0, 1fr))`,
                width: 'min(92vw, calc((100vh - 8rem) / 2), 420px)',
              }}
            >
              {gameState.body.flatMap((row, y) =>
                row.map((cell, x) => (
                  <div className={getCellClassName(cell)} key={`${x}:${y}`} />
                )),
              )}
            </div>

            {gameState.gameStatus !== GAME_STATUS.work ? (
              <div className="absolute inset-0 grid place-items-center rounded-lg bg-zinc-950/68 p-6 backdrop-blur-sm">
                <div className="w-full max-w-xs rounded-lg border border-white/15 bg-zinc-950/95 p-5 text-center shadow-xl">
                  <p className="text-2xl font-bold text-white">
                    {getOverlayTitle(gameState.gameStatus)}
                  </p>
                  <p className="mt-2 text-sm text-zinc-300">
                    当前分数 {metrics.score}
                  </p>
                  <button
                    className="mt-5 w-full rounded-md bg-yellow-300 px-4 py-3 font-bold text-zinc-950 transition hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-yellow-100"
                    onClick={toggleGame}
                    type="button"
                  >
                    {getPrimaryActionLabel(gameState.gameStatus)}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <aside className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <MetricCard label="分数" tone="text-white" value={metrics.score} />
            <MetricCard label="最佳" tone="text-yellow-200" value={bestScore} />
            <MetricCard
              label="消行"
              tone="text-emerald-200"
              value={metrics.lines}
            />
            <MetricCard
              label="等级"
              tone="text-fuchsia-200"
              value={metrics.level}
            />
          </div>

          <div className="rounded-lg border border-white/10 bg-zinc-900 p-4 shadow-xl shadow-black/35">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm font-semibold text-zinc-300">下一块</p>
              <p className="text-sm font-semibold text-cyan-200">
                {metrics.pieces}
              </p>
            </div>
            <div
              aria-label="下一块预览"
              className="mx-auto mt-4 grid h-28 w-28 grid-cols-5 grid-rows-5 gap-1 rounded-md bg-zinc-950 p-2"
              role="img"
            >
              {createPreviewCells(gameState.nextShape.body).map(
                (cell, index) => (
                  <div
                    className={getPreviewCellClassName(
                      cell,
                      gameState.nextShape.name,
                    )}
                    key={index}
                  />
                ),
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              className="rounded-md bg-emerald-300 px-4 py-3 font-bold text-zinc-950 transition hover:bg-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              onClick={toggleGame}
              type="button"
            >
              {getPrimaryActionLabel(gameState.gameStatus)}
            </button>
            <button
              className="rounded-md border border-zinc-700 bg-zinc-900 px-4 py-3 font-bold text-zinc-100 transition hover:border-yellow-200 hover:text-yellow-100 focus:outline-none focus:ring-2 focus:ring-yellow-100"
              onClick={restartGame}
              type="button"
            >
              重开
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 rounded-lg border border-white/10 bg-zinc-900 p-3 shadow-xl shadow-black/35">
            <button
              aria-label="逆时针旋转"
              className={getControlButtonClassName(controlsDisabled)}
              disabled={controlsDisabled}
              onClick={rotateBack}
              type="button"
            >
              ↺
            </button>
            <button
              aria-label="旋转"
              className={getControlButtonClassName(controlsDisabled)}
              disabled={controlsDisabled}
              onClick={rotate}
              type="button"
            >
              ↻
            </button>
            <button
              aria-label="快速落下"
              className={getControlButtonClassName(controlsDisabled)}
              disabled={controlsDisabled}
              onClick={hardDrop}
              type="button"
            >
              ⇣
            </button>
            <button
              aria-label="左移"
              className={getControlButtonClassName(controlsDisabled)}
              disabled={controlsDisabled}
              onClick={moveLeft}
              type="button"
            >
              ←
            </button>
            <button
              aria-label="下移"
              className={getControlButtonClassName(controlsDisabled)}
              disabled={controlsDisabled}
              onClick={advanceGameTick}
              type="button"
            >
              ↓
            </button>
            <button
              aria-label="右移"
              className={getControlButtonClassName(controlsDisabled)}
              disabled={controlsDisabled}
              onClick={moveRight}
              type="button"
            >
              →
            </button>
          </div>
        </aside>
      </section>
    </main>
  )
}

function MetricCard({
  label,
  tone,
  value,
}: {
  label: string
  tone: string
  value: number
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-zinc-900 p-3 shadow-lg shadow-black/25">
      <p className="text-xs text-zinc-400">{label}</p>
      <p className={`mt-1 text-2xl font-black ${tone}`}>{value}</p>
    </div>
  )
}

function createEmptyGameState(): TetrisEngineState {
  return {
    body: Array.from({ length: BOARD_HEIGHT }, () =>
      Array.from({ length: BOARD_WIDTH }, () => ({
        cssClasses: [null, null, null, null],
        val: 0,
      })),
    ),
    gameStatus: GAME_STATUS.init,
    nextShape: {
      body: null,
      name: null,
    },
    shapeName: null,
    statistic: {
      countDoubleLinesReduced: 0,
      countLinesReduced: 0,
      countQuadrupleLinesReduced: 0,
      countShapesFalled: 0,
      countShapesFalledByType: {},
      countTrippleLinesReduced: 0,
    },
  }
}

function revealActiveShape(engine: Engine) {
  for (let step = 0; step < PREVIEW_SIZE + 2; step += 1) {
    if (
      engine.state.gameStatus !== GAME_STATUS.work ||
      hasVisibleActiveShape(engine.state)
    ) {
      return
    }

    engine.moveDown()
  }
}

function hasVisibleActiveShape(state: TetrisEngineState) {
  return state.body.some((row) => row.some((cell) => cell.val === 1))
}

function cloneGameState(state: TetrisEngineState): TetrisEngineState {
  return {
    body: state.body.map((row) =>
      row.map((cell) => ({
        cssClasses: [...cell.cssClasses],
        val: cell.val,
      })),
    ),
    gameStatus: state.gameStatus,
    nextShape: {
      body: state.nextShape.body
        ? state.nextShape.body.map((row) => [...row])
        : null,
      name: state.nextShape.name,
    },
    shapeName: state.shapeName,
    statistic: {
      ...state.statistic,
      countShapesFalledByType: {
        ...state.statistic.countShapesFalledByType,
      },
    },
  }
}

function calculateMetrics(
  statistic: TetrisEngineState['statistic'],
): GameMetrics {
  const doubleLines = statistic.countDoubleLinesReduced * 2
  const trippleLines = statistic.countTrippleLinesReduced * 3
  const quadrupleLines = statistic.countQuadrupleLinesReduced * 4
  const singleLines = Math.max(
    0,
    statistic.countLinesReduced - doubleLines - trippleLines - quadrupleLines,
  )
  const lineScore =
    singleLines * 100 +
    statistic.countDoubleLinesReduced * 300 +
    statistic.countTrippleLinesReduced * 500 +
    statistic.countQuadrupleLinesReduced * 800
  const pieces = Math.max(0, statistic.countShapesFalled - 1)
  const level = Math.floor(statistic.countLinesReduced / 8) + 1

  return {
    level,
    lines: statistic.countLinesReduced,
    pieces,
    score: lineScore + pieces * 10,
  }
}

function getDropInterval(level: number) {
  return Math.max(120, 760 - (level - 1) * 58)
}

function createPreviewCells(body: TetrisEngineState['nextShape']['body']) {
  if (!body) {
    return Array.from({ length: PREVIEW_SIZE * PREVIEW_SIZE }, () => 0)
  }

  return body.flat()
}

function getShapeName(cell: TetrisEngineCell) {
  return SHAPE_NAMES.find((shapeName) => cell.cssClasses.includes(shapeName))
}

function getCellClassName(cell: TetrisEngineCell) {
  const shapeName = getShapeName(cell)

  if (!shapeName) {
    return 'rounded-sm border border-white/[0.03] bg-zinc-900/80'
  }

  const isLocked = cell.val === 2
  const lockedClassName = isLocked ? 'brightness-90 saturate-75' : ''

  return `rounded-sm border border-white/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.42),0_0_12px] ${SHAPE_COLORS[shapeName]} ${lockedClassName}`
}

function getPreviewCellClassName(
  cell: number,
  shapeName: TetrisEngineShapeName | null,
) {
  if (!cell || !shapeName) {
    return 'rounded-sm bg-zinc-900/70'
  }

  return `rounded-sm border border-white/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.42),0_0_10px] ${SHAPE_COLORS[shapeName]}`
}

function getStatusLabel(status: TetrisEngineState['gameStatus']) {
  const labels: Record<TetrisEngineState['gameStatus'], string> = {
    [GAME_STATUS.init]: '准备',
    [GAME_STATUS.work]: '进行中',
    [GAME_STATUS.pause]: '暂停',
    [GAME_STATUS.over]: '结束',
  }

  return labels[status]
}

function getOverlayTitle(status: TetrisEngineState['gameStatus']) {
  const titles: Record<TetrisEngineState['gameStatus'], string> = {
    [GAME_STATUS.init]: '准备落块',
    [GAME_STATUS.work]: '进行中',
    [GAME_STATUS.pause]: '已暂停',
    [GAME_STATUS.over]: '堆到顶部',
  }

  return titles[status]
}

function getPrimaryActionLabel(status: TetrisEngineState['gameStatus']) {
  const labels: Record<TetrisEngineState['gameStatus'], string> = {
    [GAME_STATUS.init]: '开始',
    [GAME_STATUS.work]: '暂停',
    [GAME_STATUS.pause]: '继续',
    [GAME_STATUS.over]: '再来',
  }

  return labels[status]
}

function getStatusClassName(status: TetrisEngineState['gameStatus']) {
  const tone =
    status === GAME_STATUS.work
      ? 'border-emerald-300/40 bg-emerald-300/10 text-emerald-100'
      : status === GAME_STATUS.over
        ? 'border-rose-300/40 bg-rose-300/10 text-rose-100'
        : status === GAME_STATUS.pause
          ? 'border-yellow-300/40 bg-yellow-300/10 text-yellow-100'
          : 'border-cyan-300/30 bg-cyan-300/10 text-cyan-100'

  return `w-fit rounded-md border px-3 py-2 text-sm font-bold ${tone}`
}

function getControlButtonClassName(disabled: boolean) {
  const disabledClassName = disabled
    ? 'cursor-not-allowed opacity-45'
    : 'hover:border-yellow-200 hover:bg-zinc-800 hover:text-yellow-100'

  return `aspect-square rounded-md border border-zinc-700 bg-zinc-950 text-2xl font-black text-white transition focus:outline-none focus:ring-2 focus:ring-yellow-100 ${disabledClassName}`
}
