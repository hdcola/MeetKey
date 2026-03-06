import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/auto-icons'],
  manifest: {
    name: 'MeetKey - Google Meet Controller',
    description: 'Control Google Meet from your browser',
    permissions: ['activeTab', 'scripting', 'storage'],
  },
});
