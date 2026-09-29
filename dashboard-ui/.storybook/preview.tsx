import type { Preview } from '@storybook/react-vite'

import '../src/design-system/tokens.css'
import '../src/index.css'
import { resolveTheme, SYSTEM_DARK_QUERY } from '../src/utils/theme'

// 다크 색상은 <html data-theme="dark"> 에서만 켜진다. Storybook 은 OS 설정을 따른다 (명세 dashboard-dev-ux 범위 밖).
document.documentElement.dataset.theme = resolveTheme('system', window.matchMedia(SYSTEM_DARK_QUERY).matches)

const preview: Preview = {
    parameters: {
        controls: {
            matchers: {
                color: /(background|color)$/i,
                date: /Date$/i,
            },
        },
        // a11y 위반은 테스트 실패다 (30-design-system, 40-testing)
        a11y: {
            test: 'error',
        },
        options: {
            storySort: {
                order: ['Atoms', 'Molecules', 'Organisms', 'Layouts', 'Logs'],
            },
        },
    },
}

export default preview
