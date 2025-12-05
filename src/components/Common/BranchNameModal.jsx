import React, { useEffect, useState, useRef } from "react";
import { Modal, Form, Select, Spin, notification } from "antd";
import { GET_BRANCHES } from "helpers/api_helper";
import { ADD_BRANCH } from "helpers/url_helper";

const BranchNameModal = ({ visible, onSave, onCancel }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [branchList, setBranchList] = useState([]);
  const [username, setUsername] = useState("");
  const retryTimeoutRef = useRef(null);

  // Read username from localStorage
  useEffect(() => {
    const authUser = localStorage.getItem("authUser");

    if (authUser) {
      try {
        const parsed = JSON.parse(authUser);
        setUsername(parsed.username || parsed.name || "User");
      } catch {
        setUsername("User");
      }
    }
  }, []);

  const fetchBranches = async () => {
    setLoading(true);
    try {
      const response = await GET_BRANCHES(ADD_BRANCH);

      if (response?.status === 200) {
        setBranchList(response.data);
      } else {
        notification.error({
          message: "Failed to Load Branches",
          description: "Could not fetch branch list.",
        });
      }
    } catch (err) {
      console.error("Error fetching branches:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch branches only when modal opens - IMPROVED LOGIC
  useEffect(() => {
    if (!visible) {
      // Clear any pending retry timeout when modal closes
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      return;
    }

    form.resetFields();

    const token = localStorage.getItem("access_token");

    if (token) {
      fetchBranches();
    } else {
      // Retry logic with cleanup
      retryTimeoutRef.current = setTimeout(() => {
        const retryToken = localStorage.getItem("access_token");
        if (retryToken) {
          fetchBranches();
        }
        retryTimeoutRef.current = null;
      }, 300);
    }

    // Cleanup function to clear timeout if component unmounts
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    };
  }, [visible]);

  const handleOk = () => {
    form.validateFields().then((values) => {
      onSave(values.branchName);
    });
  };

  return (
    <Modal
      title={
        <div style={{ textAlign: "center", fontSize: 18, fontWeight: 600 }}>
          Branch Selection
        </div>
      }
      open={visible}
      onOk={handleOk}
      onCancel={onCancel}
      okText="Continue"
      cancelText="Cancel"
      width={480}
      centered
    >
      {/* Logged in user */}
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <span style={{ fontSize: 15, fontWeight: 500 }}>
          Currently Logged-In as:
        </span>{" "}
        <span style={{ color: "#1890ff", fontWeight: 600 }}>
          {username}
        </span>
      </div>

      <Form form={form} layout="vertical">
        <Form.Item
          name="branchName"
          label={
            <span style={{ fontWeight: 600 }}>
              Select the branch to proceed:
            </span>
          }
          rules={[{ required: true, message: "Please select your branch" }]}
        >
          {loading ? (
            <Spin />
          ) : (
            <Select
              placeholder="Select your branch"
              options={branchList.map((b) => ({
                label: b.branch_name,
                value: b.branch_name,
              }))}
              showSearch
              filterOption={(input, option) =>
                option.label.toLowerCase().includes(input.toLowerCase())
              }
            />
          )}
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default BranchNameModal;