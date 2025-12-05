import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { notification, Form, Input, Button, Select } from "antd";
import { ArrowLeftOutlined, ReloadOutlined } from "@ant-design/icons";
import { ToastContainer } from "react-toastify";
import Loader from "components/Common/Loader";
import { GET, POST, PUT } from "helpers/api_helper"; // Reusable API methods including DELETE
import { EXPENSE_TYPE_DETAIL, EXPENSE_TYPES } from "helpers/url_helper"; // URL helpers

const { Option } = Select;

const AddExpense = () => {
    const [loading, setLoading] = useState(false);
    const [form] = Form.useForm();
    const navigate = useNavigate();
    const { id } = useParams(); // Get ID from URL
    const [isEditMode, setIsEditMode] = useState(false);

    useEffect(() => {
        if (id) {
            setIsEditMode(true);
            fetchExpenseData(id);
        }
    }, [id,fetchExpenseData]);

    const fetchExpenseData = useCallback(async (expenseId) => {
        setLoading(true);
        try {
            const response = await GET(EXPENSE_TYPE_DETAIL(expenseId)); // Use GET helper with URL
            if (response.status === 200) {
                form.setFieldsValue({
                    expense_type: response.data.name,
                    status: response.data.status,
                });
            } else {
                notification.error({ message: "Error", description: "Failed to load expense data." });
            }
        } catch (error) {
            notification.error({ message: "Error", description: "Failed to load expense data." });
        } finally {
            setLoading(false);
        }
   }, [form]);

    const onFinish = async (values) => {
        setLoading(true);
        try {
          const expenseData = {
            name: values.expense_type,
            status: values.status,
          };
      
          if (isEditMode) {
            const existingExpense = await GET(EXPENSE_TYPE_DETAIL(id));
      
            if (existingExpense.status === 200) {
              if (
                existingExpense.data.name === values.expense_type &&
                existingExpense.data.status === values.status
              ) {
                notification.warning({
                  message: "No Changes",
                  description: "No changes detected, update not required.",
                });
                setLoading(false);
                return;
              }
      
              const response = await PUT(EXPENSE_TYPE_DETAIL(id), expenseData);
              if (response.status === 200) {
                notification.success({
                  message: `${values.expense_type.toUpperCase()} Expense type updated!`,
                  description: "The Expense type has been updated successfully",
                });
                navigate("/expense/list");
              } else {
                throw new Error("Failed to update expense");
              }
            } else {
              throw new Error("Error fetching existing expense data");
            }
          } else {
            const response = await POST(EXPENSE_TYPES, expenseData);
            if (response.status === 200 || response.status === 201) {
              notification.success({
                message: `${values.expense_type.toUpperCase()} expense type added!`,
                description: "The Expense type has been added successfully",
              });
              navigate("/expense/list");
            } else {
              throw new Error("Failed to add expense");
            }
          }
        } catch (error) {
          console.error(error);
          if (error.response?.data?.name?.[0]) {
            notification.error({
              message: "Duplicate Name",
              description: error.response.data.name[0],
            });
          } else {
            notification.error({
              message: "Error",
              description: "Expense Type with this name already exists.",
            });
          }
        } finally {
          setLoading(false);
        }
      };
      

    // const handleDelete = async () => {
    //     setLoading(true);
    //     try {
    //         const response = await DELETE(EXPENSE_TYPE_DETAIL(id)); // Delete using the DELETE helper
    //         if (response.status === 200) {
    //             notification.success({
    //                 message: "Success",
    //                 description: "Expense deleted successfully!",
    //             });
    //             navigate("/expense/list");
    //         } else {
    //             throw new Error("Failed to delete expense");
    //         }
    //     } catch (error) {
    //         notification.error({
    //             message: "Error",
    //             description: "Failed to delete expense.",
    //         });
    //     } finally {
    //         setLoading(false);
    //     }
    // };

   

   
    return (
        <>
            {loading && <Loader />}
            <div className="page-content">
                <div className="container-fluid mt-4">
                    <div className="row">
                        <div className="col-md-12">
                            <div className="cursor-pointer back-icon">
                                <span onClick={() => navigate("/expense/list")}>
                                    <ArrowLeftOutlined /> Back
                                </span>
                            </div>
                            <div className="card p-4 shadow-sm" style={{ backgroundColor: "white" }}>
                                <h5 className="text-center">{isEditMode ? "Edit Expense Type" : ""}</h5>

                                <Form form={form} layout="vertical" onFinish={onFinish}>
                                    <div className="d-flex justify-content-center mb-3" style={{ width: "100%" }}>
                                        <Form.Item
                                            label="Expense Type"
                                            name="expense_type"
                                            rules={[{ required: true, message: "Please enter expense type" }]}
                                            style={{ width: "600px" }}
                                        >
                                            <Input placeholder="Enter expense type" size="large" />
                                        </Form.Item>
                                    </div>

                                   
                                    <div className="d-flex justify-content-center mb-3" style={{ width: "100%" }}>
                                        <Form.Item
                                            label="Status"
                                            name="status"
                                            rules={[{ required: true, message: "Please select a status" }]}
                                            style={{ width: "600px" }}
                                        >
                                            <Select placeholder="Status" size="large">
                                                <Option value="active">Active</Option>
                                                <Option value="inactive">Inactive</Option>
                                            </Select>
                                        </Form.Item>
                                    </div>

                                    <Form.Item className="text-center mt-3">
                                        <div className="d-flex justify-content-center">
                                            <Button type="primary" htmlType="submit" loading={loading}>
                                                {isEditMode ? "Update" : "Submit"}
                                            </Button>
                                            {isEditMode ? (
                                                <>
                                                    <Button
                                                        type="default"
                                                        style={{ marginLeft: 8 }}
                                                        onClick={() => navigate("/expense/list")}
                                                        variant="solid"
                                                        color="danger"
                                                        disabled={loading}
                                                    >
                                                        Cancel
                                                    </Button>
                                                   
                                                </>
                                            ) : (
                                                <Button
                                                    type="default"
                                                    style={{ marginLeft: 8 }}
                                                    onClick={() => form.resetFields()}
                                                    icon={<ReloadOutlined />}
                                                    variant="solid"
                                                    color="danger"
                                                    disabled={loading}
                                                >
                                                    Reset
                                                </Button>
                                            )}
                                        </div>
                                    </Form.Item>
                                </Form>
                            </div>
                        </div>
                    </div>
                </div>
                <ToastContainer />
            </div>
        </>
    );
};

export default AddExpense;
