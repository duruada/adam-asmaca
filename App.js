import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useKeepAwake } from 'expo-keep-awake';
import * as Haptics from 'expo-haptics';

import {
  MAX_MISTAKES,
  TOTAL_QUESTIONS,
  pickQuestions,
  weakestFacts,
} from './src/gameLogic';
import {
  emptyProgress,
  personalBest,
  recordAnswer,
  recordRound,
} from './src/facts';
import { clearProgress, loadProgress, saveProgress } from './src/storage';
import { colors, createScale, tabular } from './src/theme';
import EndScreen from './src/components/EndScreen';
import Gallows from './src/components/Gallows';
import Keypad from './src/components/Keypad';
import StartScreen from './src/components/StartScreen';
import TopBar from './src/components/TopBar';

/** Cevabı okuması için ekranda kalma süreleri (ms). */
const PAUSE_RIGHT = 850;
const PAUSE_WRONG = 2300;
const PAUSE_FATAL = 3400; // son parça çizilsin, adam biraz sallansın

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar hidden />
      <Game />
    </SafeAreaProvider>
  );
}

function Game() {
  useKeepAwake(); // oyun sırasında tablet ekranı kapanmasın

  const { width, height } = useWindowDimensions();
  const s = useMemo(() => createScale(width, height), [width, height]);
  const landscape = width > height;

  const [phase, setPhase] = useState('start'); // start | playing | end
  const [questions, setQuestions] = useState([]);
  const [index, setIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [missed, setMissed] = useState([]);
  const [typed, setTyped] = useState('');
  const [locked, setLocked] = useState(false);
  const [feedback, setFeedback] = useState(null); // { kind, text }
  const [result, setResult] = useState(null);
  const [ready, setReady] = useState(false);

  /**
   * İlerleme tek bir değişebilir nesnede tutuluyor: her cevapta state
   * güncellemek gereksiz render doğuruyor, oysa bu veri sadece tur
   * başında (soru seçimi) ve tur sonunda (grafik) okunuyor.
   */
  const progress = useRef(emptyProgress());
  const timer = useRef(null);
  const shake = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let alive = true;
    loadProgress().then((p) => {
      if (!alive) return;
      progress.current = p;
      setReady(true);
    });
    return () => {
      alive = false;
      clearTimeout(timer.current);
    };
  }, []);

  const newGame = useCallback(() => {
    clearTimeout(timer.current);
    progress.current.round += 1;
    setQuestions(pickQuestions(progress.current));
    setIndex(0);
    setCorrect(0);
    setMistakes(0);
    setMissed([]);
    setTyped('');
    setFeedback(null);
    setLocked(false);
    setResult(null);
    setPhase('playing');
  }, []);

  const runShake = useCallback(() => {
    shake.setValue(0);
    Animated.sequence(
      [9, -9, 5, 0].map((toValue) =>
        Animated.timing(shake, { toValue, duration: 60, useNativeDriver: true })
      )
    ).start();
  }, [shake]);

  const submit = useCallback(() => {
    if (!typed) {
      setFeedback({ kind: 'idle', text: 'Önce bir sayı yaz.' });
      runShake();
      return;
    }

    const q = questions[index];
    const truth = q.a * q.b;
    const isRight = Number(typed) === truth;

    const nextCorrect = isRight ? correct + 1 : correct;
    const nextMistakes = isRight ? mistakes : mistakes + 1;
    const nextMissed = isRight ? missed : [...missed, `${q.a}×${q.b}=${truth}`];

    // Her cevap anında kaydediliyor: uygulama tur ortasında kapanırsa
    // o ana kadarki bilgi kaybolmasın.
    recordAnswer(progress.current, q.a, q.b, isRight);
    saveProgress(progress.current);

    setLocked(true);
    setCorrect(nextCorrect);
    setMistakes(nextMistakes);
    setMissed(nextMissed);
    setFeedback(
      isRight
        ? { kind: 'right', text: 'Doğru!' }
        : { kind: 'wrong', text: `Doğru cevap: ${q.a} × ${q.b} = ${truth}` }
    );

    Haptics.notificationAsync(
      isRight
        ? Haptics.NotificationFeedbackType.Success
        : Haptics.NotificationFeedbackType.Error
    ).catch(() => {});

    const lost = nextMistakes >= MAX_MISTAKES;
    const nextIndex = index + 1;
    const wait = isRight ? PAUSE_RIGHT : lost ? PAUSE_FATAL : PAUSE_WRONG;

    timer.current = setTimeout(() => {
      if (lost || nextIndex >= TOTAL_QUESTIONS) {
        // Rekor karşılaştırması bu tur eklenmeden yapılmalı.
        const previousBest = personalBest(progress.current);
        recordRound(progress.current, {
          correct: nextCorrect,
          mistakes: nextMistakes,
          won: !lost,
        });
        saveProgress(progress.current);

        setResult({
          won: !lost,
          correct: nextCorrect,
          mistakes: nextMistakes,
          missed: nextMissed,
          history: [...progress.current.history],
          best: Math.max(previousBest, nextCorrect),
          isRecord: nextCorrect > previousBest && previousBest > 0,
          working: weakestFacts(progress.current, 5),
        });
        setPhase('end');
      } else {
        setIndex(nextIndex);
        setTyped('');
        setFeedback(null);
        setLocked(false);
      }
    }, wait);
  }, [typed, questions, index, correct, mistakes, missed, runShake]);

  const handleKey = useCallback(
    (key) => {
      if (locked) return;
      if (key === 'del') {
        setTyped((t) => t.slice(0, -1));
        return;
      }
      if (key === 'ok') {
        submit();
        return;
      }
      // En büyük cevap 100, yani 3 hane yeter. Sıfırla başlayan cevap yok.
      setTyped((t) => (t.length >= 3 || (t === '' && key === '0') ? t : t + key));
    },
    [locked, submit]
  );

  const confirmRestart = useCallback(() => {
    Alert.alert('Baştan başla', 'Oyun sıfırlansın mı?', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Yeni tur', onPress: newGame },
      {
        text: 'İlerlemeyi sil',
        style: 'destructive',
        onPress: () => {
          Alert.alert(
            'İlerlemeyi sil',
            'Hangi çarpımlarda zorlandığı ve bütün tur geçmişi silinecek. Emin misin?',
            [
              { text: 'Vazgeç', style: 'cancel' },
              {
                text: 'Sil',
                style: 'destructive',
                onPress: () => {
                  clearProgress();
                  progress.current = emptyProgress();
                  newGame();
                },
              },
            ]
          );
        },
      },
    ]);
  }, [newGame]);

  const question = questions[index];
  const dead = mistakes >= MAX_MISTAKES;

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom', 'left', 'right']}>
      {question && (
        <View style={[styles.page, { padding: s(12), gap: s(10) }]}>
          <TopBar
            questionNo={index + 1}
            correct={correct}
            mistakes={mistakes}
            onRestart={confirmRestart}
            s={s}
          />

          <View style={[styles.main, { gap: s(10) }, landscape && styles.mainRow]}>
            <View
              style={[
                styles.panel,
                styles.stage,
                { borderRadius: s(14), padding: s(10) },
              ]}
            >
              {/* Sallanma sadece bitiş ekranı açılana kadar sürsün. */}
              <Gallows
                mistakes={mistakes}
                dead={dead}
                swaying={dead && phase === 'playing'}
              />
            </View>

            <View
              style={[
                styles.panel,
                styles.play,
                { borderRadius: s(14), padding: s(12) },
              ]}
            >
              <View style={[styles.playInner, { gap: s(10), maxWidth: s(520) }]}>
                <Text style={[styles.question, tabular, { fontSize: s(46) }]}>
                  {question.a}
                  <Text style={styles.operator}> × </Text>
                  {question.b}
                  <Text style={styles.operator}> = ?</Text>
                </Text>

                <Animated.View
                  style={[
                    styles.answer,
                    {
                      height: s(64),
                      borderRadius: s(12),
                      transform: [{ translateX: shake }],
                    },
                    feedback?.kind === 'right' && styles.answerRight,
                    feedback?.kind === 'wrong' && styles.answerWrong,
                  ]}
                >
                  <Text
                    style={[
                      styles.answerText,
                      tabular,
                      { fontSize: s(36) },
                      !typed && styles.answerPlaceholder,
                      feedback?.kind === 'right' && { color: colors.green },
                      feedback?.kind === 'wrong' && { color: colors.red },
                    ]}
                  >
                    {typed || '—'}
                  </Text>
                </Animated.View>

                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  style={[
                    styles.hint,
                    { fontSize: s(17), minHeight: s(24) },
                    feedback?.kind === 'right' && { color: colors.green },
                    feedback?.kind === 'wrong' && { color: colors.red },
                  ]}
                >
                  {feedback ? feedback.text : ' '}
                </Text>

                <Keypad onPress={handleKey} disabled={locked} s={s} />
              </View>
            </View>
          </View>
        </View>
      )}

      {phase === 'start' && (
        <StartScreen onStart={newGame} loading={!ready} s={s} />
      )}
      {phase === 'end' && result && (
        <EndScreen result={result} onRestart={newGame} s={s} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  page: { flex: 1 },
  main: { flex: 1, flexDirection: 'column' },
  mainRow: { flexDirection: 'row' },
  panel: {
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.card,
    minHeight: 0,
    minWidth: 0,
  },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  play: { flex: 1.15, alignItems: 'center' },
  playInner: { flex: 1, width: '100%', alignSelf: 'center' },
  question: {
    fontWeight: '800',
    color: colors.ink,
    textAlign: 'center',
  },
  operator: { color: colors.inkSoft, fontWeight: '600' },
  answer: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.line,
    backgroundColor: colors.paper,
  },
  answerRight: { borderColor: colors.green, backgroundColor: colors.greenSoft },
  answerWrong: { borderColor: colors.red, backgroundColor: colors.redSoft },
  answerText: { fontWeight: '800', color: colors.ink },
  answerPlaceholder: { color: colors.line },
  hint: {
    textAlign: 'center',
    fontWeight: '700',
    color: colors.inkSoft,
  },
});
