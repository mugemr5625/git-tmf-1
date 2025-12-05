import React, { useState, useEffect } from "react";
//import { Button, Flex, notification, Input } from "antd";
import Loader from "components/Common/Loader";
import { useNavigate } from "react-router-dom";
import { GET, DELETE, PUT } from "helpers/api_helper"; 
import GenericCollapse from "components/Common/Collapse";
import { MoreOutlined } from "@ant-design/icons";
import { Button, Flex, notification, Input, Switch } from "antd";

const ExpenseTypeList = () => {
  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editingValue, setEditingValue] = useState("");
  const [expandedKey, setExpandedKey] = useState(null);
  const [_deleteLoader, setDeleteLoader] = useState(false);
  const [_showConfirm, setShowConfirm] = useState(false);
  const [api, contextHolder] = notification.useNotification();
  const [showOnlyActive, setShowOnlyActive] = useState(true);

  const navigate = useNavigate();

  const handleToggleChange = (checked) => {
    setShowOnlyActive(checked);
  };
  


  // Fetch expense types on load
  useEffect(() => {
    const fetchExpenseTypes = async () => {
      try {
        const response = await GET("/api/expensetypes");
        if (response?.status === 200) {
          setTableData(response.data);
          const userIds = response.data.map((item) => item.user_id);
          if (userIds.length) {
            fetchUsers(userIds);
          }
        } else {
          notification.error({ message: "Failed to load expense types" });
        }
      } catch (error) {
        notification.error({ message: "Error fetching expense types" });
      } finally {
        setLoading(false);
      }
    };

    const fetchUsers = async (userIds) => {
      try {
        const response = await GET(`/api/users?ids=${userIds.join(",")}`);
        if (response?.status === 200) {
          setUsers(response.data);
        } else {
          console.error("Failed to fetch users", response);
        }
      } catch (error) {
        console.error("Error fetching users", error);
        notification.error({ message: "Error fetching users" });
      }
    };

    fetchExpenseTypes();
  }, []);

  // Handle edit click
  const handleEdit = (id, currentName) => {
    setEditingId(id);
    setEditingValue(currentName);
  };

  const handleEditChange = (e) => {
    setEditingValue(e.target.value);
  };

  const handleEditSave = async (id) => {
    try {
      const response = await PUT(`/api/expensetypes/${id}`, { name: editingValue });
      if (response?.status === 200) {
        setTableData((prevData) =>
          prevData.map((item) => (item.id === id ? { ...item, name: editingValue } : item))
        );
        notification.success({ message: "Expense Type updated successfully" });
        setEditingId(null);
      } else {
        notification.error({ message: "Failed to update expense type" });
      }
    } catch (error) {
      notification.error({ message: "Error updating expense type" });
    }
  };

  const onDelete = async (record) => {
    try {
      setDeleteLoader(true);
      const response = await DELETE(`/api/expensetypes/${record.id}/`);
      if (response?.status === 204) {
        const updatedData = tableData.filter((item) => item.id !== record.id);
        setTableData(updatedData);
        api.success({
          message: `${record?.name.toUpperCase()} Expense type Deleted!`,


          description: "The expense type has been deleted successfully",
          duration: 0,
        });
      } else {
        api.error({
          message: "Delete Failed",
          description: "The expense type could not be deleted",
          duration: 0,
        });
      }
    } catch (error) {
      api.error({
        message: "Error",
        description: "Something went wrong while deleting",
        duration: 0,
      });
    } finally {
      setDeleteLoader(false);
      setShowConfirm(false);
    }
  };

  const enrichedTableData = (tableData || [])
  .filter(item => !showOnlyActive || item.status === "active")
  .map((item) => {

    const user = users.find((user) => user.id === item.user_id);
    return {
      ...item,
      UserName: user ? user.name : "Not found",
    };
  });

  const handleExpand = (expenseId) => {
    setExpandedKey((prevExpanded) => (prevExpanded === expenseId ? null : expenseId));
  };

  return (
    <div className="page-content">
      {contextHolder}
      {loading && <Loader />}
      {/* <Flex justify="space-between" align="center" className="mb-3">
        <h2>Expense Types</h2>

        <Button type="primary" onClick={() => navigate("/expense/add")}>
          <span className="mdi mdi-plus" /> Add Expense Type
        </Button>
      </Flex> */}

<Flex justify="space-between" align="center" className="mb-3">
  <h2>Expense Types</h2>
  <Flex gap="1rem" align="center">
    <span>Show Active Only</span>
    <Switch checked={showOnlyActive} onChange={handleToggleChange} />
    <Button type="primary" onClick={() => navigate("/expense/add")}>
      <span className="mdi mdi-plus" /> Add Expense Type
    </Button>
  </Flex>
</Flex>



      <GenericCollapse
        titleKey="name"
        data={enrichedTableData}
        contentKeys={["status"]}
        name="expense"
        onDelete={(expense) => onDelete(expense)}
        onEdit={(expense) => handleEdit(expense.id, expense.name)}
        onExpand={handleExpand}
        expandedKeys={expandedKey ? [expandedKey] : []}
        renderItem={(expense) => (
          <Flex justify="space-between" align="center">
            {editingId === expense.id ? (
              <Input
                value={editingValue}
                onChange={handleEditChange}
                onPressEnter={() => handleEditSave(expense.id)}
                onBlur={() => handleEditSave(expense.id)}
                autoFocus
              />
            ) : (
              <span onClick={() => handleEdit(expense.id, expense.name)}>{expense.name}</span>
            )}
            <MoreOutlined
              onClick={(e) => {
                e.stopPropagation();
                handleExpand(expense.id);
              }}
              style={{ cursor: "pointer", fontSize: "16px", marginLeft: "10px" }}
            />
          </Flex>
        )}
      />
    </div>
  );
};

export default ExpenseTypeList;
