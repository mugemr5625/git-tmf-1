import {
  BankOutlined,
  DollarOutlined,
  EnvironmentOutlined,
  FileOutlined,
  HomeOutlined,
  LineChartOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SettingOutlined,
  UserOutlined,
  LockOutlined,
} from '@ant-design/icons';
import { Button, Drawer, Layout, Menu, theme } from 'antd';
import { useEffect, useState ,useMemo} from 'react';
// import { useDispatch } from "react-redux";
import { useLocation, useNavigate } from 'react-router-dom';

import NotificationDropdown from "../CommonForBoth/TopbarDropdown/NotificationDropdown";
import ProfileMenu from "../CommonForBoth/TopbarDropdown/ProfileMenu";

import logoLarge from "../../assets/images/logo-large-tmf.png";
import logoLight from "../../assets/images/logolighttmf.png";

import "./VerticalLayout.css";

const { Header, Sider, Content, Footer } = Layout;

const VerticalLayout = (props) => {
  // Initialize collapsed state from sessionStorage, default to false (expanded) for desktop
  const [collapsed, setCollapsed] = useState(() => {
    const saved = sessionStorage.getItem('sidebarCollapsed');
    return saved !== null ? JSON.parse(saved) : false;
  });
  const [selectedKeys, setSelectedKeys] = useState([]);
  const [openKeys, setOpenKeys] = useState([]);
  const [mobileDrawerVisible, setMobileDrawerVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  const location = useLocation();
  const navigate = useNavigate();
  // const dispatch = useDispatch();
  
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();
  const menuItems = useMemo(() => [
  { key: '/home', icon: <HomeOutlined />, label: 'Home' },
  {
    key: 'settings',
    icon: <SettingOutlined />,
    label: 'Settings',
    children: [
      { key: '/view', icon: <BankOutlined />, label: 'Organization' },
      { key: '/branch/list', icon: <BankOutlined />, label: 'Branch' },
      { key: '/line', icon: <LineChartOutlined />, label: 'Line' },
      { key: '/area', icon: <EnvironmentOutlined />, label: 'Area' },
      { key: '/expense/list', icon: <DollarOutlined />, label: 'Expense Type' },
      { key: '/investment', icon: <DollarOutlined />, label: 'Investments' },
      { key: '/expense-transaction', icon: <FileOutlined />, label: 'Expense Transactions' },
       { key: '/user/list', icon: <UserOutlined />, label: 'Users' },
    ],
  },
  // {
  //   key: 'users',
  //   icon: <UserOutlined />,
  //   label: 'Users',
  //   children: [
  //     { key: '/user/list', icon: <UserOutlined />, label: 'All Users' },
  //   ],
  // },
  {
    key: 'loan',
    icon: <DollarOutlined />,
    label: 'Loan',
    children: [
      { key: '/disburse-loan', icon: <DollarOutlined />, label: 'Loan Disbursement' },
    ],
  },
   { key: '/reset-password', icon: <LockOutlined />, label: 'Reset Password' },
      { key: '/view-customer', icon: <LockOutlined />, label: 'Customer' },
], []);

  // const menuItems = [
  //   {
  //     key: '/home',
  //     icon: <HomeOutlined />,
  //     label: 'Home',
  //   },
  //   {
  //     key: 'settings',
  //     icon: <SettingOutlined />,
  //     label: 'Settings',
  //     children: [
  //       { key: '/view', icon: <BankOutlined />, label: 'Organization' },
  //       { key: '/branch/list', icon: <BankOutlined />, label: 'Branch' },
  //       { key: '/line', icon: <LineChartOutlined />, label: 'Line' },
  //       { key: '/area', icon: <EnvironmentOutlined />, label: 'Area' },
  //       { key: '/expense/list', icon: <DollarOutlined />, label: 'Expense Type' },
  //       { key: '/investment', icon: <DollarOutlined />, label: 'Investments' },
  //       { key: '/expense-transaction', icon: <FileOutlined />, label: 'Expense Transactions' },
  //     ],
  //   },
  //   {
  //     key: 'users',
  //     icon: <UserOutlined />,
  //     label: 'Users',
  //     children: [
  //       { key: '/user/list', icon: <UserOutlined />, label: 'All Users' },
  //     ],
  //   },
  //   {
  //     key: 'loan',
  //     icon: <DollarOutlined />,
  //     label: 'Loan',
  //     children: [
  //       { key: '/disburse-loan', icon: <DollarOutlined />, label: 'Loan Disbursement' },
  //     ],
  //   },
  // ];

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleMenuClick = (e) => {
    if (e.key.startsWith('/')) {
      navigate(e.key);
      
      if (isMobile) {
        setMobileDrawerVisible(false);
      } else {
        // Don't auto-collapse on desktop - keep user's preference
        // setCollapsed(true);
      }
    }
  };

  const handleOpenChange = (keys) => {
    if (!collapsed) {
      setOpenKeys(keys);
    }
  };

  useEffect(() => {
    const currentPath = location.pathname;
    setSelectedKeys([currentPath]);
    
    if (!collapsed) {
      const findParentKey = () => {
        for (const item of menuItems) {
          if (item.children) {
            const found = item.children.find(child => child.key === currentPath);
            if (found) return item.key;
          }
        }
        return null;
      };
      
      const parentKey = findParentKey();
      if (parentKey) {
        setOpenKeys([parentKey]);
      }
    }
  }, [location.pathname, collapsed,menuItems]);

  useEffect(() => {
    if (collapsed) {
      setOpenKeys([]);
    }
  }, [collapsed]);

  useEffect(() => {
    const updateSidebarWidth = () => {
      const sider = document.querySelector('.ant-layout-sider');
      if (sider && !collapsed && !isMobile) {
        const siderWidth = sider.offsetWidth;
        document.documentElement.style.setProperty('--sidebar-width', `${siderWidth}px`);
      } else if (collapsed || isMobile) {
        document.documentElement.style.setProperty('--sidebar-width', '80px');
      }
    };

    const timer1 = setTimeout(updateSidebarWidth, 50);
    const timer2 = setTimeout(updateSidebarWidth, 200);
    const timer3 = setTimeout(updateSidebarWidth, 500);
    
    let resizeObserver;
    
    const setupObserver = () => {
      const sider = document.querySelector('.ant-layout-sider');
      if (sider && window.ResizeObserver) {
        resizeObserver = new ResizeObserver(() => {
          updateSidebarWidth();
        });
        resizeObserver.observe(sider);
      }
    };
    
    setTimeout(setupObserver, 100);
    
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [collapsed, isMobile, menuItems]);

  const mobileDrawerContent = (
    <div style={{ padding: 0, height: "100%" }}>
      <div style={{ 
        padding: "12px 16px", 
        borderBottom: "1px solid #f0f0f0", 
        marginBottom: "8px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between"
      }}>
        <img src={logoLarge} alt="Logo" height="28" style={{ marginLeft: "4px" }} />
        <Button 
          type="text" 
          icon={<MenuFoldOutlined />} 
          onClick={() => setMobileDrawerVisible(false)}
          style={{ 
            fontSize: "16px",
            padding: "4px",
            minWidth: "32px",
            height: "32px"
          }}
        />
      </div>
      <div style={{ padding: "0 4px" }}>
        <Menu
          mode="inline"
          selectedKeys={selectedKeys}
          openKeys={openKeys}
          onOpenChange={handleOpenChange}
          onClick={handleMenuClick}
          items={menuItems}
          style={{ 
            border: "none",
            background: "transparent",
          }}
        />
      </div>
    </div>
  );

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider 
        trigger={null} 
        collapsible 
        collapsed={collapsed}
        width="max-content"
        collapsedWidth={80}
        style={{
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          display: isMobile ? 'none' : 'block',
          minWidth: collapsed ? '80px' : 'max-content',
          maxWidth: collapsed ? '80px' : '300px',
        }}
      >
        <div style={{ 
          height: '64px', 
          margin: '16px', 
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <img 
            src={collapsed ? logoLight : logoLarge} 
            alt="Logo" 
            style={{ 
              height: collapsed ? '32px' : '40px',
              transition: 'all 0.2s',
            }} 
          />
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={selectedKeys}
          openKeys={collapsed ? [] : openKeys}
          onOpenChange={collapsed ? () => {} : handleOpenChange}
          onClick={handleMenuClick}
          items={menuItems}
        />
      </Sider>
      <Layout 
        className={`main-layout ${collapsed ? 'sidebar-collapsed' : 'sidebar-expanded'} ${isMobile ? 'mobile-view' : 'desktop-view'}`}
        style={{ 
          marginLeft: isMobile ? 0 : (collapsed ? 80 : 'var(--sidebar-width, 250px)'),
          transition: 'margin-left 0.3s ease',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Header
          className={`main-header ${collapsed ? 'sidebar-collapsed' : 'sidebar-expanded'} ${isMobile ? 'mobile-view' : 'desktop-view'}`}
          style={{
            padding: '0 16px',
            background: colorBgContainer,
            position: 'fixed',
            zIndex: 1000,
            width: isMobile ? '100%' : `calc(100% - ${collapsed ? '80px' : 'var(--sidebar-width, 250px)'})`,
            left: isMobile ? 0 : (collapsed ? '80px' : 'var(--sidebar-width, 250px)'),
            top: 0,
            display: 'flex',
            alignItems: 'center',
            transition: 'left 0.3s ease, width 0.3s ease',
            height: '64px',
          }}
        >
          <Button
            type="text"
            icon={isMobile ? <MenuUnfoldOutlined /> : (collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />)}
            onClick={() => {
              if (isMobile) {
                setMobileDrawerVisible(true);
              } else {
                const newCollapsed = !collapsed;
                setCollapsed(newCollapsed);
                // Persist sidebar state in sessionStorage
                sessionStorage.setItem('sidebarCollapsed', JSON.stringify(newCollapsed));
              }
            }}
            style={{
              fontSize: '16px',
              width: 64,
              height: 64,
              marginLeft: '-12px',
            }}
          />
          <div style={{ 
            flex: 1, 
            display: 'flex', 
            justifyContent: 'flex-end', 
            alignItems: 'center', 
            gap: '8px'
          }}>
            <NotificationDropdown />
            <ProfileMenu />
          </div>
        </Header>
        <Content
          style={{
            margin: '64px 0 0',
            overflow: 'initial',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              flex: 1,
              background: colorBgContainer,
              borderRadius: borderRadiusLG,
              padding: '16px',
            }}
          >
            {props.children}
          </div>
        </Content>
        <Footer style={{ 
          textAlign: 'center', 
          padding: '24px 16px',
          marginTop: 'auto',
          flexShrink: 0
        }}>
          © {new Date().getFullYear()} - THINKTANK
        </Footer>
      </Layout>
      
      <Drawer
        title=""
        placement="left"
        onClose={() => setMobileDrawerVisible(false)}
        open={mobileDrawerVisible}
        width={260}
        bodyStyle={{ padding: 0 }}
        headerStyle={{ display: "none" }}
        style={{ display: isMobile ? 'block' : 'none' }}
      >
        {mobileDrawerContent}
      </Drawer>
    </Layout>
  );
};

export default VerticalLayout;