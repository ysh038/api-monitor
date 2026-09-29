import type { Preview } from '@storybook/react-vite'

import '../src/design-system/tokens.css'
import '../src/index.css'

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
