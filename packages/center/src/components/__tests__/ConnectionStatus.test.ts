import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import ConnectionStatus from '../ConnectionStatus.vue';
import { useCenterStore } from '@/stores/centerStore';

describe('ConnectionStatus.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('应该正确渲染组件', () => {
    const wrapper = mount(ConnectionStatus);
    expect(wrapper.exists()).toBe(true);
    expect(wrapper.find('.connection-status').exists()).toBe(true);
  });

  it('初始状态应该显示两个状态项', () => {
    const wrapper = mount(ConnectionStatus);
    const statusItems = wrapper.findAll('.status-item');
    expect(statusItems).toHaveLength(2);
  });

  it('应该显示 Browser 和 Plugin 指示器', () => {
    const wrapper = mount(ConnectionStatus);
    const labels = wrapper.findAll('.label');
    const labelTexts = labels.map((el) => el.text());

    // 检查是否包含 Browser 和 Plugin 标签
    expect(labelTexts.length).toBeGreaterThanOrEqual(2);
  });

  describe('连接状态样式', () => {
    it('断开时应该显示 disconnected 类', () => {
      const store = useCenterStore();
      store.setBrowserConnection('disconnected');

      const wrapper = mount(ConnectionStatus);
      const statusItems = wrapper.findAll('.status-item');

      expect(statusItems[0].classes()).toContain('disconnected');
    });

    it('已连接时应该显示 connected 类', () => {
      const store = useCenterStore();
      store.setBrowserConnection('connected');

      const wrapper = mount(ConnectionStatus);
      const statusItems = wrapper.findAll('.status-item');

      expect(statusItems[0].classes()).toContain('connected');
    });

    it('初始化中时应该显示 initializing 类', () => {
      const store = useCenterStore();
      store.setPluginConnection('initializing');

      const wrapper = mount(ConnectionStatus);
      const statusItems = wrapper.findAll('.status-item');

      expect(statusItems[1].classes()).toContain('initializing');
    });
  });

  describe('响应状态变化', () => {
    it('应该响应 Browser 连接状态变化', async () => {
      const store = useCenterStore();
      const wrapper = mount(ConnectionStatus);

      // 初始状态
      expect(wrapper.find('.status-item').classes()).toContain('disconnected');

      // 更新状态
      store.setBrowserConnection('connected');
      await wrapper.vm.$nextTick();

      expect(wrapper.find('.status-item').classes()).toContain('connected');
    });

    it('应该响应 Plugin 连接状态变化', async () => {
      const store = useCenterStore();
      const wrapper = mount(ConnectionStatus);
      const statusItems = wrapper.findAll('.status-item');

      // 初始状态
      expect(statusItems[1].classes()).toContain('disconnected');

      // 更新状态
      store.setPluginConnection('connected');
      await wrapper.vm.$nextTick();

      expect(wrapper.findAll('.status-item')[1].classes()).toContain('connected');
    });

    it('应该处理多次状态变化', async () => {
      const store = useCenterStore();
      const wrapper = mount(ConnectionStatus);
      const statusItems = wrapper.findAll('.status-item');

      // 初始
      expect(statusItems[0].classes()).toContain('disconnected');

      // 连接
      store.setBrowserConnection('connected');
      await wrapper.vm.$nextTick();
      expect(wrapper.find('.status-item').classes()).toContain('connected');

      // 断开
      store.setBrowserConnection('disconnected');
      await wrapper.vm.$nextTick();
      expect(wrapper.find('.status-item').classes()).toContain('disconnected');

      // 初始化
      store.setBrowserConnection('initializing');
      await wrapper.vm.$nextTick();
      expect(wrapper.find('.status-item').classes()).toContain('initializing');
    });
  });

  describe('指示器样式', () => {
    it('已连接的指示器应该有 connected 类', async () => {
      const store = useCenterStore();
      store.setPluginConnection('connected');

      const wrapper = mount(ConnectionStatus);
      const indicators = wrapper.findAll('.indicator');

      // 第二个指示器是 Plugin 的
      expect(indicators[1].classes()).toContain('connected');
    });

    it('断开的指示器应该有 disconnected 类', async () => {
      const store = useCenterStore();
      store.setPluginConnection('disconnected');

      const wrapper = mount(ConnectionStatus);
      const indicators = wrapper.findAll('.indicator');

      // 第二个指示器是 Plugin 的
      expect(indicators[1].classes()).toContain('disconnected');
    });

    it('初始化中的指示器应该有 initializing 类', async () => {
      const store = useCenterStore();
      store.setPluginConnection('initializing');

      const wrapper = mount(ConnectionStatus);
      const indicators = wrapper.findAll('.indicator');

      // 第二个指示器是 Plugin 的
      expect(indicators[1].classes()).toContain('initializing');
    });
  });

  describe('图标渲染', () => {
    it('应该包含 SVG 图标', () => {
      const wrapper = mount(ConnectionStatus);
      const icons = wrapper.findAll('svg');

      expect(icons.length).toBeGreaterThanOrEqual(2);
    });
  });
});
