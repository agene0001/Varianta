<template>
  <div class="drill-mode">
    <div v-if="!openings.length" class="no-openings">
      <p>No openings available for drilling!</p>
    </div>
    
    <div v-else class="drill-content">
      <div class="drill-info">
        <h3>Opening Drill Challenge</h3>
        <p class="drill-description">Get as many opening moves correct in a row as possible! A random opening and position will be presented.</p>
      </div>
      
      <div class="drill-stats">
        <div class="stats-grid">
          <div class="stat-item">
            <span class="stat-number">{{ currentStreak }}</span>
            <span class="stat-label">Current Streak</span>
          </div>
          <div class="stat-item">
            <span class="stat-number">{{ bestStreak }}</span>
            <span class="stat-label">Best Streak</span>
          </div>
          <div class="stat-item">
            <span class="stat-number">{{ totalCorrect }}</span>
            <span class="stat-label">Total Correct</span>
          </div>
          <div class="stat-item">
            <span class="stat-number">{{ totalAttempts }}</span>
            <span class="stat-label">Total Attempts</span>
          </div>
        </div>
        
        <div v-if="totalAttempts > 0" class="accuracy">
          <div class="accuracy-bar">
            <div class="accuracy-fill" :style="{ width: accuracy + '%' }"></div>
          </div>
          <span class="accuracy-text">{{ Math.round(accuracy) }}% Accuracy</span>
        </div>
      </div>
      
      <div v-if="!drillStarted" class="drill-start">
        <div class="difficulty-selector">
          <h4>Select Difficulty</h4>
          <div class="difficulty-options">
            <label v-for="diff in difficulties" :key="diff.value" class="difficulty-option">
              <input
                type="radio"
                :value="diff.value"
                v-model="selectedDifficulty"
                name="difficulty"
              >
              <span class="difficulty-info">
                <strong>{{ diff.name }}</strong>
                <small>{{ diff.description }}</small>
              </span>
            </label>
          </div>
        </div>
        
        <button @click="startDrill" class="start-drill-btn">
          🚀 Start Drill
        </button>
      </div>
      
      <div v-else class="active-drill">
        <div v-if="currentQuestion" class="question-info">
          <div class="question-header">
            <h4>{{ currentQuestion.opening.name }}</h4>
            <span class="question-counter">Question {{ questionNumber }}</span>
          </div>
          <div class="question-context">
            <p><strong>Line:</strong> {{ currentQuestion.line.name }}</p>
            <p><strong>Scenario:</strong> {{ currentQuestion.context }}</p>
            <p class="move-prompt">What is the {{ currentQuestion.isWhite ? 'white' : 'black' }} move here?</p>
          </div>
        </div>
        
        <div v-if="feedback" :class="['drill-feedback', feedbackType]">
          <div class="feedback-content">
            <span class="feedback-icon">{{ feedbackType === 'correct' ? '🎉' : '❌' }}</span>
            <div class="feedback-text">
              <p>{{ feedback }}</p>
              <p v-if="feedbackType === 'incorrect'" class="correct-answer">
                Correct answer: <strong>{{ currentQuestion?.expectedMove }}</strong>
              </p>
            </div>
          </div>
        </div>
        
        <div class="move-input">
          <div class="input-group">
            <input
              v-model="playerMove"
              @keyup.enter="submitAnswer"
              placeholder="Enter your move (e.g., e4, Nf3, O-O)"
              class="drill-input"
              :disabled="showingFeedback"
            >
            <button 
              @click="submitAnswer" 
              :disabled="!playerMove.trim() || showingFeedback"
              class="submit-btn"
            >
              Submit
            </button>
          </div>
        </div>
        
        <div class="drill-controls">
          <button @click="skipQuestion" :disabled="showingFeedback" class="control-btn skip-btn">
            ⏭ Skip Question
          </button>
          <button @click="endDrill" class="control-btn end-btn">
            🏁 End Drill
          </button>
          <button @click="newQuestion" :disabled="showingFeedback" class="control-btn new-btn">
            🔄 New Question
          </button>
        </div>
        
        <div class="recent-questions">
          <h4>Recent Questions</h4>
          <div class="recent-list">
            <div
              v-for="(result, index) in recentResults.slice(-5).reverse()"
              :key="index"
              :class="['recent-item', { correct: result.correct, incorrect: !result.correct }]"
            >
              <span class="recent-opening">{{ result.opening }}</span>
              <span class="recent-move">{{ result.playerMove }}</span>
              <span class="recent-status">{{ result.correct ? '✓' : '✗' }}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div v-if="streakBroken && currentStreak === 0 && drillStarted" class="streak-broken">
        <h3>😢 Streak Broken!</h3>
        <p>You got {{ lastStreakLength }} questions correct in a row.</p>
        <div class="streak-actions">
          <button @click="continueAfterBreak" class="continue-btn">Continue Drilling</button>
          <button @click="endDrill" class="end-after-break-btn">End Session</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { Opening } from '../types/chess'

interface Props {
  openings: Opening[]
  currentPosition: string
}

interface DrillQuestion {
  opening: Opening
  line: Opening['lines'][0]
  moveIndex: number
  expectedMove: string
  isWhite: boolean
  context: string
}

interface DrillResult {
  opening: string
  playerMove: string
  expectedMove: string
  correct: boolean
}

interface Difficulty {
  name: string
  value: string
  description: string
  moveRange: [number, number]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  moveMade: [from: string, to: string, position: string]
  reset: []
}>()

const drillStarted = ref(false)
const currentStreak = ref(0)
const bestStreak = ref(0)
const totalCorrect = ref(0)
const totalAttempts = ref(0)
const currentQuestion = ref<DrillQuestion | null>(null)
const playerMove = ref('')
const feedback = ref('')
const feedbackType = ref<'correct' | 'incorrect' | ''>('')
const showingFeedback = ref(false)
const questionNumber = ref(1)
const recentResults = ref<DrillResult[]>([])
const streakBroken = ref(false)
const lastStreakLength = ref(0)
const selectedDifficulty = ref('beginner')

const difficulties: Difficulty[] = [
  {
    name: 'Beginner',
    value: 'beginner',
    description: 'First 3-6 moves of openings',
    moveRange: [0, 5]
  },
  {
    name: 'Intermediate',
    value: 'intermediate',
    description: 'Moves 3-10 of openings',
    moveRange: [2, 9]
  },
  {
    name: 'Advanced',
    value: 'advanced',
    description: 'Moves 5-15 of openings',
    moveRange: [4, 14]
  },
  {
    name: 'Expert',
    value: 'expert',
    description: 'Any move in the opening',
    moveRange: [0, 20]
  }
]

const currentDifficulty = computed(() => {
  return difficulties.find(d => d.value === selectedDifficulty.value) || difficulties[0]
})

const accuracy = computed(() => {
  return totalAttempts.value > 0 ? (totalCorrect.value / totalAttempts.value) * 100 : 0
})

const startDrill = () => {
  drillStarted.value = true
  streakBroken.value = false
  generateNewQuestion()
}

const endDrill = () => {
  drillStarted.value = false
  currentQuestion.value = null
  playerMove.value = ''
  feedback.value = ''
  feedbackType.value = ''
  showingFeedback.value = false
  questionNumber.value = 1
  streakBroken.value = false
  emit('reset')
}

const generateNewQuestion = () => {
  if (props.openings.length === 0) return
  
  // Select random opening
  const opening = props.openings[Math.floor(Math.random() * props.openings.length)]
  if (!opening.lines.length) return
  
  // Select random line
  const line = opening.lines[Math.floor(Math.random() * opening.lines.length)]
  if (!line.moves.length) return
  
  // Select move based on difficulty
  const [minMove, maxMove] = currentDifficulty.value.moveRange
  const availableMoves = line.moves.slice(minMove, Math.min(maxMove + 1, line.moves.length))
  if (!availableMoves.length) return
  
  const moveIndex = Math.floor(Math.random() * availableMoves.length) + minMove
  const expectedMove = line.moves[moveIndex]
  const isWhite = moveIndex % 2 === 0
  
  // Create context
  const previousMoves = line.moves.slice(0, moveIndex)
  const context = previousMoves.length > 0 
    ? `After: ${previousMoves.slice(-3).join(', ')}`
    : 'From starting position'
  
  currentQuestion.value = {
    opening,
    line,
    moveIndex,
    expectedMove,
    isWhite,
    context
  }
  
  playerMove.value = ''
  feedback.value = ''
  feedbackType.value = ''
  showingFeedback.value = false
  streakBroken.value = false
}

const submitAnswer = () => {
  if (!playerMove.value.trim() || !currentQuestion.value || showingFeedback.value) return
  
  const normalizedPlayerMove = normalizeMove(playerMove.value.trim())
  const normalizedExpectedMove = normalizeMove(currentQuestion.value.expectedMove)
  const isCorrect = normalizedPlayerMove === normalizedExpectedMove
  
  totalAttempts.value++
  
  // Record result
  recentResults.value.push({
    opening: currentQuestion.value.opening.name,
    playerMove: playerMove.value.trim(),
    expectedMove: currentQuestion.value.expectedMove,
    correct: isCorrect
  })
  
  if (isCorrect) {
    totalCorrect.value++
    currentStreak.value++
    bestStreak.value = Math.max(bestStreak.value, currentStreak.value)
    feedback.value = `Correct! Great job! 🎉 Streak: ${currentStreak.value}`
    feedbackType.value = 'correct'
  } else {
    lastStreakLength.value = currentStreak.value
    currentStreak.value = 0
    feedback.value = `Incorrect. Better luck next time!`
    feedbackType.value = 'incorrect'
    
    if (lastStreakLength.value > 0) {
      streakBroken.value = true
    }
  }
  
  showingFeedback.value = true
  
  // Auto advance to next question after delay
  setTimeout(() => {
    if (!streakBroken.value || isCorrect) {
      nextQuestion()
    }
  }, isCorrect ? 2000 : 3000)
}

const skipQuestion = () => {
  if (showingFeedback.value || !currentQuestion.value) return
  
  totalAttempts.value++
  lastStreakLength.value = currentStreak.value
  currentStreak.value = 0
  
  // Record as incorrect
  recentResults.value.push({
    opening: currentQuestion.value.opening.name,
    playerMove: '(skipped)',
    expectedMove: currentQuestion.value.expectedMove,
    correct: false
  })
  
  feedback.value = `Skipped. The answer was: ${currentQuestion.value.expectedMove}`
  feedbackType.value = 'incorrect'
  showingFeedback.value = true
  
  if (lastStreakLength.value > 0) {
    streakBroken.value = true
    setTimeout(() => {
      // Don't auto-advance when streak is broken
    }, 3000)
  } else {
    setTimeout(() => {
      nextQuestion()
    }, 2000)
  }
}

const nextQuestion = () => {
  questionNumber.value++
  generateNewQuestion()
}

const newQuestion = () => {
  generateNewQuestion()
}

const continueAfterBreak = () => {
  streakBroken.value = false
  nextQuestion()
}

const normalizeMove = (move: string): string => {
  return move.replace(/[+#!?]/g, '').trim().toLowerCase()
}

// Watch for opening changes
watch(() => props.openings, () => {
  if (drillStarted.value && props.openings.length === 0) {
    endDrill()
  }
}, { deep: true })

// Load saved stats (in a real app, you'd use localStorage or a database)
const loadStats = () => {
  const saved = localStorage.getItem('chess-drill-stats')
  if (saved) {
    try {
      const stats = JSON.parse(saved)
      bestStreak.value = stats.bestStreak || 0
      totalCorrect.value = stats.totalCorrect || 0
      totalAttempts.value = stats.totalAttempts || 0
    } catch (e) {
      console.warn('Could not load drill stats')
    }
  }
}

// Save stats
const saveStats = () => {
  const stats = {
    bestStreak: bestStreak.value,
    totalCorrect: totalCorrect.value,
    totalAttempts: totalAttempts.value
  }
  localStorage.setItem('chess-drill-stats', JSON.stringify(stats))
}

// Watch for stat changes to save
watch([bestStreak, totalCorrect, totalAttempts], () => {
  saveStats()
})

// Load stats on mount
loadStats()
</script>

<style scoped>
.drill-mode {
  color: #c0dfa1;
}

.no-openings {
  text-align: center;
  padding: 2rem;
  color: #82a3a1;
}

.drill-info {
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #465362;
}

.drill-info h3 {
  color: #c0dfa1;
  margin: 0 0 0.5rem 0;
  font-size: 1.3rem;
}

.drill-description {
  color: #82a3a1;
  margin: 0;
  line-height: 1.5;
}

.drill-stats {
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: rgba(70, 83, 98, 0.3);
  border-radius: 8px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

.stat-item {
  text-align: center;
}

.stat-number {
  display: block;
  font-size: 1.5rem;
  font-weight: bold;
  color: #9fc490;
}

.stat-label {
  display: block;
  font-size: 0.8rem;
  color: #82a3a1;
}

.accuracy {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.accuracy-bar {
  flex: 1;
  height: 8px;
  background: #465362;
  border-radius: 4px;
  overflow: hidden;
}

.accuracy-fill {
  height: 100%;
  background: linear-gradient(90deg, #9fc490, #c0dfa1);
  transition: width 0.3s ease;
}

.accuracy-text {
  color: #82a3a1;
  font-size: 0.9rem;
  font-weight: 600;
}

.drill-start {
  text-align: center;
}

.difficulty-selector {
  margin-bottom: 2rem;
}

.difficulty-selector h4 {
  color: #82a3a1;
  margin: 0 0 1rem 0;
  font-size: 1.1rem;
}

.difficulty-options {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-width: 400px;
  margin: 0 auto;
}

.difficulty-option {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: #465362;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.difficulty-option:hover {
  background: #82a3a1;
  color: #011936;
}

.difficulty-option input[type="radio"] {
  accent-color: #9fc490;
}

.difficulty-info {
  flex: 1;
  text-align: left;
}

.difficulty-info strong {
  display: block;
  margin-bottom: 0.25rem;
}

.difficulty-info small {
  color: #82a3a1;
  font-size: 0.8rem;
}

.start-drill-btn {
  padding: 1rem 2rem;
  background: #9fc490;
  color: #011936;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1.1rem;
  font-weight: 600;
  transition: all 0.3s ease;
}

.start-drill-btn:hover {
  background: #82a3a1;
}

.question-info {
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: rgba(70, 83, 98, 0.3);
  border-radius: 8px;
}

.question-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.question-header h4 {
  color: #c0dfa1;
  margin: 0;
  font-size: 1.2rem;
}

.question-counter {
  color: #82a3a1;
  font-size: 0.9rem;
}

.question-context p {
  margin: 0.25rem 0;
  color: #82a3a1;
}

.move-prompt {
  color: #9fc490 !important;
  font-weight: 600;
  margin-top: 0.5rem !important;
}

.drill-feedback {
  margin-bottom: 1.5rem;
  padding: 1rem;
  border-radius: 8px;
  border-left: 4px solid;
}

.drill-feedback.correct {
  background: rgba(159, 196, 144, 0.2);
  border-color: #9fc490;
}

.drill-feedback.incorrect {
  background: rgba(192, 223, 161, 0.2);
  border-color: #c0dfa1;
}

.feedback-content {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
}

.feedback-icon {
  font-size: 1.5rem;
}

.feedback-text p {
  margin: 0 0 0.5rem 0;
}

.correct-answer {
  color: #9fc490;
  font-weight: 600;
}

.move-input {
  margin-bottom: 1.5rem;
}

.input-group {
  display: flex;
  gap: 0.5rem;
}

.drill-input {
  flex: 1;
  padding: 0.75rem;
  background: #465362;
  color: #c0dfa1;
  border: 2px solid #465362;
  border-radius: 6px;
  font-size: 1rem;
}

.drill-input:focus {
  outline: none;
  border-color: #82a3a1;
}

.drill-input:disabled {
  opacity: 0.6;
}

.submit-btn {
  padding: 0.75rem 1.5rem;
  background: #9fc490;
  color: #011936;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.3s ease;
}

.submit-btn:hover:not(:disabled) {
  background: #82a3a1;
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.drill-controls {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 1.5rem;
}

.control-btn {
  padding: 0.5rem 1rem;
  background: #465362;
  color: #c0dfa1;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.3s ease;
  flex: 1;
  min-width: 100px;
}

.control-btn:hover:not(:disabled) {
  background: #82a3a1;
  color: #011936;
}

.control-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.recent-questions h4 {
  color: #82a3a1;
  margin: 0 0 0.5rem 0;
  font-size: 1rem;
}

.recent-list {
  background: rgba(70, 83, 98, 0.3);
  border-radius: 6px;
  padding: 0.5rem;
  max-height: 120px;
  overflow-y: auto;
}

.recent-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem;
  margin-bottom: 0.25rem;
  border-radius: 4px;
  font-size: 0.8rem;
}

.recent-item.correct {
  background: rgba(159, 196, 144, 0.2);
}

.recent-item.incorrect {
  background: rgba(192, 223, 161, 0.2);
}

.recent-opening {
  flex: 1;
  font-weight: 600;
}

.recent-move {
  color: #82a3a1;
}

.recent-status {
  font-weight: bold;
  margin-left: auto;
}

.recent-item.correct .recent-status {
  color: #9fc490;
}

.recent-item.incorrect .recent-status {
  color: #c0dfa1;
}

.streak-broken {
  text-align: center;
  padding: 2rem;
  background: rgba(192, 223, 161, 0.2);
  border-radius: 8px;
  border: 2px solid #c0dfa1;
}

.streak-broken h3 {
  color: #c0dfa1;
  margin: 0 0 1rem 0;
}

.streak-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-top: 1rem;
}

.continue-btn,
.end-after-break-btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.3s ease;
}

.continue-btn {
  background: #9fc490;
  color: #011936;
}

.end-after-break-btn {
  background: #465362;
  color: #c0dfa1;
}

.continue-btn:hover {
  background: #82a3a1;
}

.end-after-break-btn:hover {
  background: #82a3a1;
  color: #011936;
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .question-header {
    flex-direction: column;
    gap: 0.5rem;
    align-items: stretch;
  }
  
  .input-group {
    flex-direction: column;
  }
  
  .drill-controls {
    justify-content: center;
  }
  
  .difficulty-options {
    max-width: none;
  }
  
  .streak-actions {
    flex-direction: column;
  }
}
</style>