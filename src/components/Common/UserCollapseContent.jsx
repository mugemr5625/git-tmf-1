import React from "react";
import { Descriptions } from "antd";

const UserCollapseContent = ({ user }) => {
  if (!user) return null;

  // Helper function to extract all unique branches, lines, and areas from line_allocations
  const getLineAllocationDetails = (allocations) => {
    if (!allocations || allocations.length === 0) {
      return { 
        branches: [], 
        lines: [], 
        areas: [] 
      };
    }
    
    // Extract unique branch names
    const branches = [...new Set(allocations.map(a => a.branch_name).filter(Boolean))];
    
    // Extract unique line names
    const lines = [...new Set(allocations.map(a => a.line_name).filter(Boolean))];
    
    // Extract unique area names
    const areas = [...new Set(allocations.map(a => a.area_name).filter(Boolean))];

    return {
      branches,
      lines,
      areas
    };
  };

  // Helper function to extract all unique expense names from user_expenses
  const getExpenseNames = (expenses) => {
    if (!expenses || expenses.length === 0) {
      return [];
    }
    // Note: The API response shows expense IDs but not names
    // You may need to map these IDs to names if you have the expense list
    return expenses.map(e => `Expense ID: ${e.expense}`);
  };

  const { branches, lines, areas } = getLineAllocationDetails(user.line_allocations);
  const expenses = getExpenseNames(user.user_expenses);

  return (
    <div style={{ background: "#fff", padding: "0px 0px" }}>
      <Descriptions
        bordered
        size="small"
        column={{ xs: 1, sm: 2, md: 3 }}
        labelStyle={{
          fontWeight: 700,
          background: "#e5e4e4ff",
          width: "140px",
        }}
      >
        <Descriptions.Item label="User ID">
          {user.id || "N/A"}
        </Descriptions.Item>
        <Descriptions.Item label="Username">
          {user.username || "N/A"}
        </Descriptions.Item>
        <Descriptions.Item label="Full Name">
          {user.full_name || "N/A"}
        </Descriptions.Item>
        <Descriptions.Item label="Email">
          {user.email || "N/A"}
        </Descriptions.Item>
        <Descriptions.Item label="Mobile">
          {user.mobile_number || "N/A"}
        </Descriptions.Item>
        <Descriptions.Item label="Role">
          {user.role?.toUpperCase() || "N/A"}
        </Descriptions.Item>
        <Descriptions.Item label="Branch(es)" span={3}>
          {branches.length > 0 ? branches.join(", ") : "N/A"}
        </Descriptions.Item>
        <Descriptions.Item label="Line(s)" span={3}>
          {lines.length > 0 ? lines.join(", ") : "N/A"}
        </Descriptions.Item>
        <Descriptions.Item label="Area(s)" span={3}>
          {areas.length > 0 ? areas.join(", ") : "N/A"}
        </Descriptions.Item>
        <Descriptions.Item label="Expenses" span={3}>
          {expenses.length > 0 ? expenses.join(", ") : "N/A"}
        </Descriptions.Item>
        <Descriptions.Item label="Address" span={2}>
          {user.address || "N/A"}
        </Descriptions.Item>
        <Descriptions.Item label="Pin Code">
          {user.pin_code || "N/A"}
        </Descriptions.Item>
        <Descriptions.Item label="Allow Old Transaction">
          {user.allow_old_transaction ? "Yes" : "No"}
        </Descriptions.Item>
        <Descriptions.Item label="Created" span={2}>
          {user.created_ts ? new Date(user.created_ts).toLocaleString() : "N/A"}
        </Descriptions.Item>
      </Descriptions>
    </div>
  );
};

export default UserCollapseContent;