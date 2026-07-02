declare module 'tetris-engine' {
  export type TetrisEngineCellValue = 0 | 1 | 2
  export type TetrisEngineGameStatus = 0 | 1 | 2 | 3
  export type TetrisEngineShapeName =
    'IShape' | 'JShape' | 'LShape' | 'OShape' | 'SShape' | 'TShape' | 'ZShape'

  export type TetrisEngineCell = {
    cssClasses: Array<string | null>
    val: TetrisEngineCellValue
  }

  export type TetrisEngineStatistic = {
    countDoubleLinesReduced: number
    countLinesReduced: number
    countQuadrupleLinesReduced: number
    countShapesFalled: number
    countShapesFalledByType: Partial<Record<TetrisEngineShapeName, number>>
    countTrippleLinesReduced: number
  }

  export type TetrisEngineState = {
    body: Array<Array<TetrisEngineCell>>
    gameStatus: TetrisEngineGameStatus
    nextShape: {
      body: Array<Array<0 | 1>> | null
      name: TetrisEngineShapeName | null
    }
    shapeName: TetrisEngineShapeName | null
    statistic: TetrisEngineStatistic
  }

  export class Engine {
    constructor(
      width?: number,
      height?: number,
      renderHandle?: (state: TetrisEngineState) => void,
      defaultHeap?: Array<Array<0 | 1>>,
      additionalShapes?: Record<string, Array<Array<0 | 1>>>,
    )

    readonly state: TetrisEngineState

    moveDown(): void
    moveLeft(): void
    moveRight(): void
    moveUp(): void
    pause(): boolean | undefined
    rotate(): void
    rotateBack(): void
    start(): boolean | undefined
  }

  export const tetraShapes: Record<TetrisEngineShapeName, Array<Array<0 | 1>>>
}
