import { createFileRoute } from '@tanstack/react-router'
import { useCallback, useEffect, useMemo, useState } from 'react'

type Cell = {
  x: number
  y: number
}

type Direction = 'up' | 'right' | 'down' | 'left'
type GameStatus = 'ready' | 'running' | 'paused' | 'lost' | 'won'

type GameState = {
  direction: Direction
  food: Cell
  nextDirection: Direction
  score: number
  snake: Array<Cell>
  status: GameStatus
}

type BoardCell = {
  isFood: boolean
  key: string
  snakeIndex?: number
}

const BOARD_SIZE = 20
const HIGH_SCORE_KEY = 'tanstack-start-snake-high-score'
const START_DIRECTION: Direction = 'right'
const START_FOOD = { x: 14, y: 10 }
const START_SNAKE: Array<Cell> = [
  { x: 9, y: 10 },
  { x: 8, y: 10 },
  { x: 7, y: 10 },
]

const DIRECTION_DELTAS: Record<Direction, Cell> = {
  up: { x: 0, y: -1 },
  right: { x: 1, y: 0 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
}

const KEY_DIRECTIONS: Partial<Record<string, Direction>> = {
  arrowup: 'up',
  w: 'up',
  arrowright: 'right',
  d: 'right',
  arrowdown: 'down',
  s: 'down',
  arrowleft: 'left',
  a: 'left',
}

export const Route = createFileRoute('/')({
  component: SnakeGame,
})

function SnakeGame() {
  const [game, setGame] = useState(createInitialGame)
  const [bestScore, setBestScore] = useState(0)
  const tickMs = Math.max(72, 150 - Math.floor(game.score / 4) * 10)
  const boardCells = useMemo(
    () => createBoardCells(game.snake, game.food),
    [game.food, game.snake],
  )
  const controlsDisabled = game.status === 'lost' || game.status === 'won'

  const turn = useCallback((direction: Direction) => {
    setGame((current) => {
      if (current.status === 'lost' || current.status === 'won') {
        return current
      }

      if (isOppositeDirection(current.nextDirection, direction)) {
        return current
      }

      return {
        ...current,
        nextDirection: direction,
        status: current.status === 'ready' ? 'running' : current.status,
      }
    })
  }, [])

  const toggleGame = useCallback(() => {
    setGame((current) => {
      if (current.status === 'running') {
        return { ...current, status: 'paused' }
      }

      if (current.status === 'lost' || current.status === 'won') {
        return { ...createInitialGame(), status: 'running' }
      }

      return { ...current, status: 'running' }
    })
  }, [])

  const restartGame = useCallback(() => {
    setGame({ ...createInitialGame(), status: 'running' })
  }, [])

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
      console.warn('读取贪吃蛇最高分失败', {
        key: HIGH_SCORE_KEY,
        error,
      })
    }
  }, [])

  useEffect(() => {
    if (game.score <= bestScore) {
      return
    }

    setBestScore(game.score)

    try {
      window.localStorage.setItem(HIGH_SCORE_KEY, String(game.score))
    } catch (error) {
      console.warn('保存贪吃蛇最高分失败', {
        key: HIGH_SCORE_KEY,
        score: game.score,
        error,
      })
    }
  }, [bestScore, game.score])

  useEffect(() => {
    if (game.status !== 'running') {
      return
    }

    const timer = window.setInterval(() => {
      setGame(advanceGame)
    }, tickMs)

    return () => window.clearInterval(timer)
  }, [game.status, tickMs])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const direction = KEY_DIRECTIONS[event.key.toLowerCase()]

      if (direction) {
        event.preventDefault()
        turn(direction)
        return
      }

      if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault()
        toggleGame()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [toggleGame, turn])

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-5 text-slate-100 sm:px-6 lg:px-8">
      <section className="mx-auto grid min-h-[calc(100vh-2.5rem)] max-w-6xl items-center gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-5">
          <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-cyan-300">
                Snake Arcade
              </p>
              <h1 className="mt-2 text-4xl font-black text-white sm:text-5xl">
                贪吃蛇小游戏
              </h1>
            </div>
            <div className={getStatusClassName(game.status)}>
              {getStatusLabel(game.status)}
            </div>
          </header>

          <div className="relative mx-auto w-full max-w-[640px] overflow-hidden rounded-lg border border-cyan-300/20 bg-slate-900 p-2 shadow-2xl shadow-cyan-950/40">
            <div
              aria-label="贪吃蛇游戏棋盘"
              className="grid aspect-square gap-1 rounded-md bg-slate-950 p-2"
              role="img"
              style={{
                gridTemplateColumns: `repeat(${BOARD_SIZE}, minmax(0, 1fr))`,
              }}
            >
              {boardCells.map((cell) => (
                <div className={getCellClassName(cell)} key={cell.key} />
              ))}
            </div>

            {game.status !== 'running' ? (
              <div className="absolute inset-0 grid place-items-center bg-slate-950/60 p-6 backdrop-blur-sm">
                <div className="w-full max-w-xs rounded-lg border border-white/15 bg-slate-950/90 p-5 text-center shadow-xl">
                  <p className="text-2xl font-bold text-white">
                    {getOverlayTitle(game.status)}
                  </p>
                  <p className="mt-2 text-sm text-slate-300">
                    当前得分 {game.score}
                  </p>
                  <button
                    className="mt-5 w-full rounded-md bg-cyan-300 px-4 py-3 font-bold text-slate-950 transition hover:bg-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-100"
                    onClick={toggleGame}
                    type="button"
                  >
                    {getPrimaryActionLabel(game.status)}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <aside className="space-y-4 rounded-lg border border-slate-800 bg-slate-900/80 p-4 shadow-xl shadow-slate-950/40">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-slate-700 bg-slate-950 p-3">
              <p className="text-xs text-slate-400">得分</p>
              <p className="mt-1 text-2xl font-black text-white">
                {game.score}
              </p>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-950 p-3">
              <p className="text-xs text-slate-400">最佳</p>
              <p className="mt-1 text-2xl font-black text-amber-200">
                {bestScore}
              </p>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-950 p-3">
              <p className="text-xs text-slate-400">速度</p>
              <p className="mt-1 text-2xl font-black text-rose-200">
                {Math.round(1000 / tickMs)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              className="rounded-md bg-emerald-300 px-4 py-3 font-bold text-slate-950 transition hover:bg-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              onClick={toggleGame}
              type="button"
            >
              {getPrimaryActionLabel(game.status)}
            </button>
            <button
              className="rounded-md border border-slate-600 bg-slate-950 px-4 py-3 font-bold text-slate-100 transition hover:border-cyan-300 hover:text-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-200"
              onClick={restartGame}
              type="button"
            >
              重开
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div />
            <button
              aria-label="上"
              className={getControlButtonClassName(controlsDisabled)}
              disabled={controlsDisabled}
              onClick={() => turn('up')}
              type="button"
            >
              ↑
            </button>
            <div />
            <button
              aria-label="左"
              className={getControlButtonClassName(controlsDisabled)}
              disabled={controlsDisabled}
              onClick={() => turn('left')}
              type="button"
            >
              ←
            </button>
            <button
              aria-label="下"
              className={getControlButtonClassName(controlsDisabled)}
              disabled={controlsDisabled}
              onClick={() => turn('down')}
              type="button"
            >
              ↓
            </button>
            <button
              aria-label="右"
              className={getControlButtonClassName(controlsDisabled)}
              disabled={controlsDisabled}
              onClick={() => turn('right')}
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

function createInitialGame(): GameState {
  return {
    direction: START_DIRECTION,
    food: START_FOOD,
    nextDirection: START_DIRECTION,
    score: 0,
    snake: START_SNAKE.map((cell) => ({ ...cell })),
    status: 'ready',
  }
}

function advanceGame(current: GameState): GameState {
  if (current.status !== 'running') {
    return current
  }

  const direction = current.nextDirection
  const head = current.snake[0]
  const delta = DIRECTION_DELTAS[direction]
  const nextHead = {
    x: head.x + delta.x,
    y: head.y + delta.y,
  }
  const ateFood = isSameCell(nextHead, current.food)
  const bodyToCheck = ateFood ? current.snake : current.snake.slice(0, -1)

  if (
    isOutsideBoard(nextHead) ||
    bodyToCheck.some((cell) => isSameCell(cell, nextHead))
  ) {
    return {
      ...current,
      direction,
      nextDirection: direction,
      status: 'lost',
    }
  }

  const nextSnake = [
    nextHead,
    ...(ateFood ? current.snake : current.snake.slice(0, -1)),
  ]

  if (!ateFood) {
    return {
      ...current,
      direction,
      nextDirection: direction,
      snake: nextSnake,
    }
  }

  const nextFood = createFood(nextSnake)

  return {
    ...current,
    direction,
    food: nextFood ?? current.food,
    nextDirection: direction,
    score: current.score + 1,
    snake: nextSnake,
    status: nextFood ? 'running' : 'won',
  }
}

function createFood(snake: Array<Cell>) {
  const occupiedCells = new Set(snake.map(cellKey))
  const emptyCells: Array<Cell> = []

  for (let y = 0; y < BOARD_SIZE; y += 1) {
    for (let x = 0; x < BOARD_SIZE; x += 1) {
      const cell = { x, y }

      if (!occupiedCells.has(cellKey(cell))) {
        emptyCells.push(cell)
      }
    }
  }

  if (emptyCells.length === 0) {
    return undefined
  }

  return emptyCells[Math.floor(Math.random() * emptyCells.length)]
}

function createBoardCells(snake: Array<Cell>, food: Cell) {
  const snakeIndexes = new Map(
    snake.map((cell, index) => [cellKey(cell), index]),
  )

  return Array.from({ length: BOARD_SIZE * BOARD_SIZE }, (_, index) => {
    const cell = {
      x: index % BOARD_SIZE,
      y: Math.floor(index / BOARD_SIZE),
    }

    return {
      isFood: isSameCell(cell, food),
      key: cellKey(cell),
      snakeIndex: snakeIndexes.get(cellKey(cell)),
    } satisfies BoardCell
  })
}

function cellKey(cell: Cell) {
  return `${cell.x}:${cell.y}`
}

function isOutsideBoard(cell: Cell) {
  return (
    cell.x < 0 || cell.x >= BOARD_SIZE || cell.y < 0 || cell.y >= BOARD_SIZE
  )
}

function isSameCell(first: Cell, second: Cell) {
  return first.x === second.x && first.y === second.y
}

function isOppositeDirection(first: Direction, second: Direction) {
  return (
    (first === 'up' && second === 'down') ||
    (first === 'down' && second === 'up') ||
    (first === 'left' && second === 'right') ||
    (first === 'right' && second === 'left')
  )
}

function getStatusLabel(status: GameStatus) {
  const labels: Record<GameStatus, string> = {
    ready: '准备',
    running: '进行中',
    paused: '暂停',
    lost: '结束',
    won: '通关',
  }

  return labels[status]
}

function getOverlayTitle(status: GameStatus) {
  const titles: Record<GameStatus, string> = {
    ready: '准备开始',
    running: '进行中',
    paused: '已暂停',
    lost: '撞上了',
    won: '通关成功',
  }

  return titles[status]
}

function getPrimaryActionLabel(status: GameStatus) {
  const labels: Record<GameStatus, string> = {
    ready: '开始',
    running: '暂停',
    paused: '继续',
    lost: '再来',
    won: '再来',
  }

  return labels[status]
}

function getStatusClassName(status: GameStatus) {
  const tone =
    status === 'running'
      ? 'border-emerald-300/40 bg-emerald-300/10 text-emerald-100'
      : status === 'lost'
        ? 'border-rose-300/40 bg-rose-300/10 text-rose-100'
        : status === 'won'
          ? 'border-amber-300/40 bg-amber-300/10 text-amber-100'
          : 'border-cyan-300/30 bg-cyan-300/10 text-cyan-100'

  return `w-fit rounded-md border px-3 py-2 text-sm font-bold ${tone}`
}

function getCellClassName(cell: BoardCell) {
  if (cell.isFood) {
    return 'rounded-full bg-rose-400 shadow-[0_0_18px_rgba(251,113,133,0.8)]'
  }

  if (cell.snakeIndex === 0) {
    return 'rounded-sm bg-emerald-200 shadow-[0_0_16px_rgba(110,231,183,0.75)]'
  }

  if (typeof cell.snakeIndex === 'number') {
    return 'rounded-sm bg-emerald-500'
  }

  return 'rounded-sm bg-slate-900/80'
}

function getControlButtonClassName(disabled: boolean) {
  const disabledClassName = disabled
    ? 'cursor-not-allowed opacity-45'
    : 'hover:border-cyan-300 hover:bg-slate-800 hover:text-cyan-100'

  return `aspect-square rounded-md border border-slate-700 bg-slate-950 text-2xl font-black text-white transition focus:outline-none focus:ring-2 focus:ring-cyan-200 ${disabledClassName}`
}
