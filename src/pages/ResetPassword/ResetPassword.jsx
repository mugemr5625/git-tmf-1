import React, { useEffect, useState } from "react";
import { Form, Select, Button, Card, Modal, message, Row, Col, Spin, Input } from "antd";
import { LockOutlined, EyeInvisibleOutlined, EyeTwoTone, LoadingOutlined } from "@ant-design/icons";
import { GET, POST } from "../../helpers/api_helper";
import { USERS } from "helpers/url_helper";

const { Option } = Select;

// Use the correct API endpoint for reset password
const RESET_PASSWORD_API = "/api/users";

const ResetPassword = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [branches, setBranches] = useState([]);
  const [lines, setLines] = useState([]);
  const [users, setUsers] = useState([]);
  const [allUsersData, setAllUsersData] = useState([]);
  const [filteredLines, setFilteredLines] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);

  // Fetch users data on component mount
  useEffect(() => {
    fetchUsersData();
  }, []);

  const fetchUsersData = async () => {
    try {
      setDataLoading(true);
      const response = await GET(USERS);
      
      if (response?.status === 200 && response.data) {
        const userData = Array.isArray(response.data) ? response.data : [];
        setAllUsersData(userData);

        // Extract unique branches from employees
        const uniqueBranches = new Set();
        userData.forEach(user => {
          if (user.employees && Array.isArray(user.employees)) {
            user.employees.forEach(emp => {
              if (emp.branch_name) {
                uniqueBranches.add(emp.branch_name);
              }
            });
          }
        });
        setBranches(Array.from(uniqueBranches).map((name, index) => ({ id: index, name })));

        // Extract unique lines
        const uniqueLines = new Set();
        userData.forEach(user => {
          if (user.employees && Array.isArray(user.employees)) {
            user.employees.forEach(emp => {
              if (emp.line_name) {
                uniqueLines.add(emp.line_name);
              }
            });
          }
        });
        setLines(Array.from(uniqueLines).map((name, index) => ({ id: index, name })));
      }
    } catch (error) {
      console.error("Failed to fetch users data:", error);
      message.error(`Failed to fetch data: ${error.message || "Unknown error"}`);
      setAllUsersData([]);
    } finally {
      setDataLoading(false);
    }
  };

  // Handle branch selection
  const handleBranchChange = (branchName) => {
    form.setFieldsValue({ line_name: undefined, user_name: undefined });
    
    // Filter lines based on selected branch
    const uniqueLines = new Set();
    allUsersData.forEach(user => {
      if (user.employees && Array.isArray(user.employees)) {
        user.employees.forEach(emp => {
          if (emp.branch_name === branchName && emp.line_name) {
            uniqueLines.add(emp.line_name);
          }
        });
      }
    });
    setFilteredLines(Array.from(uniqueLines).map((name, index) => ({ id: index, name })));
    setFilteredUsers([]);
  };

  // Handle line selection
  const handleLineChange = (lineName) => {
    form.setFieldsValue({ user_name: undefined });
    
    const branchName = form.getFieldValue('branch_name');
    
    // Filter users based on selected branch and line
    const filteredUsersList = [];
    const seenUserIds = new Set();

    allUsersData.forEach(user => {
      if (user.employees && Array.isArray(user.employees)) {
        user.employees.forEach(emp => {
          if (
            emp.branch_name === branchName &&
            emp.line_name === lineName &&
            !seenUserIds.has(user.id)
          ) {
            seenUserIds.add(user.id);
            filteredUsersList.push({
              id: user.id,
              name: user.username,
              username: user.username,
              employee_id: emp.id
            });
          }
        });
      }
    });

    setFilteredUsers(filteredUsersList);
  };

  // Validate password strength
  const validatePassword = (password) => {
    const minLength = 4;
    return password.length >= minLength;
  };

  // Handle form submission
  const handleSubmit = async (values) => {
    const selectedUser = filteredUsers.find(user => user.name === values.user_name);
    
    if (!selectedUser) {
      message.error("Please select a valid user");
      return;
    }

    // Validate password strength
    if (!validatePassword(values.new_password)) {
      message.error("Password must be at least 4 characters");
      return;
    }

    // Check if passwords match
    if (values.new_password !== values.confirm_password) {
      message.error("Passwords do not match");
      return;
    }

    Modal.confirm({
      title: "Confirm Password Reset",
      content: (
        <div>
          <p>Are you sure you want to reset the password for:</p>
          <p><strong>Branch:</strong> {values.branch_name}</p>
          <p><strong>Line:</strong> {values.line_name}</p>
          <p><strong>User:</strong> {values.user_name} ({selectedUser.username})</p>
        </div>
      ),
      okText: "Submit",
      cancelText: "Cancel",
      onOk: () => handlePasswordReset(selectedUser.id, values),
    });
  };

  // Call reset password API
  const handlePasswordReset = async (userId, values) => {
    try {
      setLoading(true);
      
      // Prepare request body matching the API structure
      const requestBody = {
        new_password: values.new_password
      };

      // Build endpoint with user ID: /api/users/{id}/reset-password/
      const endpoint = `${RESET_PASSWORD_API}/${userId}/reset-password/`;
      
      const response = await POST(endpoint, requestBody);
      
      if (response?.status === 200 || response?.data?.message) {
        message.success(response?.data?.message || "Password reset successfully!");
        form.resetFields();
        setFilteredLines([]);
        setFilteredUsers([]);
      } else {
        message.error("Failed to reset password. Please try again.");
      }
    } catch (error) {
      console.error("Password reset error:", error);
      const errorMsg = 
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        "Unknown error";
      message.error(`Failed to reset password: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle form reset
  const handleReset = () => {
    form.resetFields();
    setFilteredLines([]);
    setFilteredUsers([]);
  };

  return (
    <div style={{ padding: '0 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
        <LockOutlined style={{ marginRight: '8px', fontSize: '20px' }} />
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>Reset User Password</h2>
      </div>

      <Card
        bordered={false}
        style={{ marginLeft: 0, marginRight: 0 }}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          autoComplete="off"
        >
          <Row gutter={16}>
            <Col xs={24} sm={24} md={8}>
              <Form.Item
                label="Branch Name"
                name="branch_name"
                rules={[{ required: true, message: "Please select a branch" }]}
              >
                <Select
                  placeholder="Select Branch"
                  onChange={handleBranchChange}
                  showSearch
                  loading={dataLoading}
                  notFoundContent={dataLoading ? <Spin size="small" /> : null}
                  suffixIcon={dataLoading ? <LoadingOutlined spin /> : undefined}
                  filterOption={(input, option) =>
                    option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                  }
                >
                  {branches.map(branch => (
                    <Option key={branch.id} value={branch.name}>
                      {branch.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>

            <Col xs={24} sm={24} md={8}>
              <Form.Item
                label="Line Name"
                name="line_name"
                rules={[{ required: true, message: "Please select a line" }]}
              >
                <Select
                  placeholder="Select Line"
                  onChange={handleLineChange}
                  disabled={!form.getFieldValue('branch_name')}
                  showSearch
                  filterOption={(input, option) =>
                    option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                  }
                >
                  {filteredLines.map(line => (
                    <Option key={line.id} value={line.name}>
                      {line.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>

            <Col xs={24} sm={24} md={8}>
              <Form.Item
                label="User Name"
                name="user_name"
                rules={[{ required: true, message: "Please select a user" }]}
              >
                <Select
                  placeholder="Select User"
                  disabled={!form.getFieldValue('line_name')}
                  showSearch
                  filterOption={(input, option) =>
                    option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                  }
                >
                  {filteredUsers.map(user => (
                    <Option key={user.id} value={user.name}>
                      {user.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={24} md={12}>
              <Form.Item
                label="New Password"
                name="new_password"
                rules={[
                  { required: true, message: "Please enter a new password" },
                  {
                    min: 4,
                    message: "Password must be at least 4 characters"
                  }
                ]}
              >
                <Input.Password
                  placeholder="Enter new password"
                  iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={24} md={12}>
              <Form.Item
                label="Confirm Password"
                name="confirm_password"
                dependencies={['new_password']}
                rules={[
                  { required: true, message: "Please confirm your password" },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('new_password') === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error('Passwords do not match'));
                    },
                  }),
                ]}
              >
                <Input.Password
                  placeholder="Confirm new password"
                  iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <Button onClick={handleReset}>
                Clear
              </Button>
              <Button type="primary" htmlType="submit" loading={loading}>
                Reset Password
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default ResetPassword;