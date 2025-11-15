import React, { createContext, useState, useEffect, useContext, useMemo } from 'react';

// 1. 创建 Context 对象
export const AuthContext = createContext(null);

// 2. 创建 Provider 组件
// 这个组件将在应用顶层使用，它负责获取和提供数据
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);       // 存储用户信息
  const [roles, setRoles] = useState([]);       // 存储角色列表
  const [isLoading, setIsLoading] = useState(true); // 标记是否正在加载数据
  const [error, setError] = useState(null);     // 存储错误信息

  useEffect(() => {
    // 这个 effect 只在组件挂载时运行一次
    // 在真实的 Superset 插件环境中，这个 fetch 会成功。
    // 在 Storybook 中，它会失败，这没关系，因为我们稍后会 mock 它。
    fetch('/api/v1/me/')
      .then(response => {
        if (!response.ok) {
          throw new Error('用户未认证或 API 不可用');
        }
        return response.json();
      })
      .then(data => {
        setUser(data.user);
        // 从返回的 roles 对象中提取出所有角色的名字，存为一个数组
        setRoles(Object.keys(data.roles || {}));
      })
      .catch(err => {
        console.error("获取用户信息失败:", err);
        setError(err);
      })
      .finally(() => {
        setIsLoading(false); // 无论成功失败，加载状态都结束
      });
  }, []);

  // 使用 useMemo 优化性能，确保 context 的值只在依赖项变化时才重新创建
  const value = useMemo(() => ({
    user,
    roles,
    isLoading,
    error,
    // 提供一个便捷的辅助函数，用于在组件中检查用户是否拥有某个角色
    hasRole: (roleName) => roles.includes(roleName),
  }), [user, roles, isLoading, error]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// 3. 创建一个自定义 Hook，让组件可以方便地使用 Context
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    // 如果组件不在 Provider 内部，则抛出错误，方便调试
    throw new Error('useAuth 必须在 AuthProvider 内部使用');
  }
  return context;
}