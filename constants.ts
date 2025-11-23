
import { Category, Prompt, Structure } from './types';

export const INITIAL_STRUCTURES: Structure[] = [
  {
    id: 'costar',
    title: 'COSTAR Framework',
    description: 'Контекст, Задача, Стиль, Тон, Аудитория, Формат',
    defaultComponents: ['Контекст', 'Задача', 'Стиль', 'Тон', 'Аудитория', 'Формат ответа']
  },
  {
    id: 'tag',
    title: 'TAG Framework',
    description: 'Задача, Действие, Цель',
    defaultComponents: ['Задача', 'Действие', 'Цель', 'Контекст']
  },
  {
    id: 'rtf',
    title: 'RTF Framework',
    description: 'Роль, Задача, Формат',
    defaultComponents: ['Роль', 'Задача', 'Формат', 'Ограничения']
  },
  {
    id: 'midjourney',
    title: 'Midjourney Standard',
    description: 'Объект, Среда, Стиль, Параметры',
    defaultComponents: ['Объект', 'Среда', 'Окружение', 'Освещение', 'Цвет', 'Настроение', 'Композиция', 'Параметры (--ar, --v)']
  }
];

export const INITIAL_PROMPTS: Prompt[] = [
  {
    id: '1',
    title: 'Генератор SEO-статей v2',
    category: Category.TEXT,
    tags: ['Маркетинг', 'Копирайтинг', 'SEO'],
    modelRecommendation: 'Gemini 2.5 Flash / GPT-4',
    description: 'Генерирует структурированную, SEO-оптимизированную статью.',
    systemContent: `### Контекст
Я профессиональный SEO-копирайтер для блога в индустрии [ИНДУСТРИЯ].

### Стиль
Информативный, авторитетный, но доступный.

### Тон
Вовлекающий и профессиональный.

### Формат ответа
Markdown с заголовками H1, H2, H3. В начале добавь раздел с ключевыми выводами (bullet points).`,
    userContent: `### Задача
Напиши подробную, SEO-оптимизированную статью на тему [КЛЮЧЕВОЕ_СЛОВО].

### Аудитория
[ЦЕЛЕВАЯ_АУДИТОРИЯ], ищущая практические советы.`,
    structureId: 'costar',
    components: [
      { id: 'c1', label: 'Контекст', value: 'Я профессиональный SEO-копирайтер для блога в индустрии [ИНДУСТРИЯ].', target: 'SYSTEM' },
      { id: 'c2', label: 'Задача', value: 'Напиши подробную, SEO-оптимизированную статью на тему [КЛЮЧЕВОЕ_СЛОВО].', target: 'USER' },
      { id: 'c3', label: 'Стиль', value: 'Информативный, авторитетный, но доступный.', target: 'SYSTEM' },
      { id: 'c4', label: 'Тон', value: 'Вовлекающий и профессиональный.', target: 'SYSTEM' },
      { id: 'c5', label: 'Аудитория', value: '[ЦЕЛЕВАЯ_АУДИТОРИЯ], ищущая практические советы.', target: 'USER' },
      { id: 'c6', label: 'Формат ответа', value: 'Markdown с заголовками H1, H2, H3. В начале добавь раздел с ключевыми выводами (bullet points).', target: 'SYSTEM' }
    ],
    notes: 'Лучше работает, если указать конкретный поисковый запрос.',
    exampleOutput: `# Полный гид по [КЛЮЧЕВОЕ_СЛОВО]\n...`
  },
  {
    id: '2',
    title: 'Senior React Разработчик (Code Review)',
    category: Category.TECHNICAL,
    tags: ['Код', 'React', 'TypeScript'],
    modelRecommendation: 'Gemini 2.5 Flash',
    description: 'Действует как старший разработчик для рефакторинга.',
    systemContent: `Ты — World-Class Senior React Engineer. Твоя задача — проводить ревью кода, находить проблемы производительности и предлагать улучшения в стиле Modern React.`,
    userContent: `Проведи ревью следующего фрагмента кода:
\`\`\`
[ФРАГМЕНТ_КОДА]
\`\`\`
Пожалуйста, выполни следующее:
1. Определи узкие места.
2. Предложи рефакторинг.
3. Убедись, что типы TypeScript строгие.`,
    structureId: 'rtf',
    components: [
        { id: 'r1', label: 'Роль', value: 'World-Class Senior React Engineer', target: 'SYSTEM' },
        { id: 'r2', label: 'Задача', value: 'Провести ревью кода, найти проблемы, предложить улучшения.', target: 'USER' },
        { id: 'r3', label: 'Ограничения', value: 'Использовать Modern React (Hooks), строгий TypeScript.', target: 'SYSTEM' }
    ],
    notes: 'Вставьте код непосредственно в переменную [ФРАГМЕНТ_КОДА].'
  }
];
