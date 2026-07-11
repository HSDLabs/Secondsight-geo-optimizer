import { useCallback, useEffect, useRef, useReducer } from 'react'
import {
  analysisProgressReducer,
  buildSimulatedProgressPlan,
  createInitialAnalysisProgressState
} from '../components/machine-understanding/utils/progressiveAnalysis'

export function useProgressiveAnalysis() {
  const [progressState, dispatch] = useReducer(
    analysisProgressReducer,
    undefined,
    createInitialAnalysisProgressState
  )

  const timerIdsRef = useRef([])

  const clearAnalysisProgress = useCallback(() => {
    timerIdsRef.current.forEach(timerId => window.clearTimeout(timerId))
    timerIdsRef.current = []
  }, [])

  const startAnalysisProgress = useCallback((url) => {
    clearAnalysisProgress()
    dispatch({ type: 'analysis/start', url })

    const plan = buildSimulatedProgressPlan(url)

    timerIdsRef.current = plan.map(({ delay, event }) => (
      window.setTimeout(() => dispatch(event), delay)
    ))
  }, [clearAnalysisProgress])

  const applyProgressEvent = useCallback((event) => {
    dispatch(event)
  }, [])

  useEffect(() => () => {
    clearAnalysisProgress()
  }, [clearAnalysisProgress])

  return {
    progressState,
    startAnalysisProgress,
    applyProgressEvent,
    clearAnalysisProgress
  }
}
