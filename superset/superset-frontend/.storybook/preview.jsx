/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

// =================================================================
// 所有的 Imports
// =================================================================
import React from 'react';
import { combineReducers, createStore, applyMiddleware, compose } from 'redux';
import { Provider } from 'react-redux';
import thunk from 'redux-thunk';
import { withJsx } from '@mihkeleidast/storybook-addon-source';
import { supersetTheme, ThemeProvider } from '@superset-ui/core';

import { AuthContext } from '../src/auth/AuthContext'; // <--- 权限相关
import { AntdThemeProvider } from '../src/components/AntdThemeProvider';
import { GlobalStyles } from '../src/GlobalStyles';
import reducerIndex from 'spec/helpers/reducerIndex';

import 'src/theme.ts';
import './storybook.css';

// =================================================================
// 权限模拟相关的数据和配置
// =================================================================

// --- 模拟数据中心 ---
const MOCK_USERS_DATA = {
  ProjectManager: {
    user: { username: 'manager', first_name: '项目', last_name: '经理' },
    roles: ['Project_Manager', 'Alpha', 'Public'],
    isLoading: false,
    error: null,
  },
  Developer: {
    user: { username: 'dev', first_name: '开发', last_name: '人员' },
    roles: ['Developer', 'Alpha'],
    isLoading: false,
    error: null,
  },
  Unauthenticated: {
    user: null,
    roles: [],
    isLoading: false,
    error: new Error('用户未认证'),
  },
};

// --- Storybook 工具栏全局类型 (用于切换角色) ---
export const globalTypes = {
  role: {
    name: '切换角色 (Role)',
    description: '模拟不同的用户角色来测试组件权限',
    defaultValue: 'ProjectManager',
    toolbar: {
      icon: 'user',
      items: ['ProjectManager', 'Developer', 'Unauthenticated'],
      showName: true,
    },
  },
};


// =================================================================
// Redux Store 初始化
// =================================================================
const store = createStore(
  combineReducers(reducerIndex),
  {},
  compose(applyMiddleware(thunk)),
);


// =================================================================
// 定义所有的 Decorators
// =================================================================

// 1. Redux Provider Decorator
const providerDecorator = Story => (
  <Provider store={store}>
    <Story />
  </Provider>
);

// 2. 主题和全局样式 Decorator
const themeDecorator = Story => (
  <ThemeProvider theme={supersetTheme}>
    <AntdThemeProvider>
      <GlobalStyles />
      <Story />
    </AntdThemeProvider>
  </ThemeProvider>
);

// 3. 【新增】权限模拟 AuthContext Decorator
const authDecorator = (Story, context) => {
  const selectedRole = context.globals.role;
  const mockAuthData = MOCK_USERS_DATA[selectedRole];

  const mockedContextValue = {
    ...mockAuthData,
    hasRole: (roleName) => mockAuthData.roles.includes(roleName),
  };

  return (
    <AuthContext.Provider value={mockedContextValue}>
      <Story />
    </AuthContext.Provider>
  );
};


// =================================================================
// 【关键】合并并导出唯一的 Decorators 数组
// Decorator 的顺序很重要，它决定了组件被包裹的层级关系
// 从上到下，依次从外到内包裹。
// =================================================================
export const decorators = [
  providerDecorator, // 最外层是 Redux Provider
  themeDecorator,    // 然后是主题 Provider
  authDecorator,     // 然后是我们的权限 Provider
  withJsx,           // 最后是 Storybook 插件
];


// =================================================================
// 【关键】合并并导出唯一的 Parameters 对象
// =================================================================
export const parameters = {
  // 来自你原有配置
  paddings: {
    values: [
      { name: 'None', value: '0px' },
      { name: 'Small', value: '16px' },
      { name: 'Medium', value: '32px' },
      { name: 'Large', value: '64px' },
    ],
    default: 'Medium',
  },
  options: {
    storySort: {
      order: [
        'Superset Frontend',
        ['Controls', 'Display', 'Feedback', 'Input', '*'],
        ['Overview', 'Examples', '*'],
        'Design System',
        [
          'Introduction',
          'Foundations',
          'Components',
          ['Overview', 'Examples', '*'],
          'Patterns',
          '*',
        ],
        ['Overview', 'Examples', '*'],
        '*',
      ],
    },
  },

  // 合并后的 controls 对象
  controls: {
    expanded: true, // 来自你原有配置
    sort: 'alpha',  // 来自你原有配置
    matchers: {     // 来自新配置
      color: /(background|color)$/i,
      date: /Date$/,
    },
  },
  
  // 来自新配置
  actions: { argTypesRegex: "^on[A-Z].*" },
};