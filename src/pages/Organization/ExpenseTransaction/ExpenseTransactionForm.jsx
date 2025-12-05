import ReloadOutlined from "@ant-design/icons/lib/icons/ReloadOutlined";
import { Button, Form, Input, Select, notification } from "antd";
import Loader from "components/Common/Loader";
import PAYMENT_MODES_OPTIONS from "constants/payment_modes";
import { POST, PUT } from "helpers/api_helper";
import { getDetails, getList } from "helpers/getters";
import {
  ADD_BRANCH,
  EXPENSE_TRANSACTION,
  EXPENSE_TYPES,
  LINE,
} from "helpers/url_helper";
import { Fragment, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ToastContainer } from "react-toastify";

const ExpenseTransactionForm = () => {
  const [form] = Form.useForm();

  const navigate = useNavigate();
  const params = useParams();

  const [loading, setLoading] = useState(true);
  const [branchList, setBranchList] = useState(null);
  const [lineList, setLineList] = useState(null);
  const [expenseTypeList, setExpenseTypeList] = useState(null);
  const [expenseTransaction, setExpenseTransaction] = useState(null);
  const [isFormEmpty, setIsFormEmpty] = useState(!params.id);

  useEffect(() => {
    if (params.id)
      getDetails(EXPENSE_TRANSACTION, params.id).then((res) =>
        setExpenseTransaction(res)
      );
  }, [params.id, form]);

  useEffect(() => {
    getList(ADD_BRANCH).then((res) => setBranchList(res));
  }, []);
  useEffect(() => {
    getList(LINE).then((res) => setLineList(res));
  }, []);
  useEffect(() => {
    getList(EXPENSE_TYPES).then((res) => setExpenseTypeList(res));
  }, []);

  useEffect(() => {
    if (
      branchList != null &&
      lineList != null &&
      expenseTypeList != null &&
      (params.id == null || expenseTransaction != null)
    ) {
      setLoading(false);
      form.setFieldsValue(expenseTransaction);
    }
  }, [
    branchList,
    lineList,
    expenseTypeList,
    params.id,
    expenseTransaction,
    form,
  ]);

  const onFinish = async (values) => {
    setLoading(true);
    try {
      let response;
      if (params.id) {
        response = await PUT(`${EXPENSE_TRANSACTION}${params.id}/`, values);
      } else {
        response = await POST(EXPENSE_TRANSACTION, values);
      }
      if (response?.status === 200 || response?.status === 201) {
        const selectedExpenseType = expenseTypeList?.find(
          (type) => type.id === values.EXPNS_TYPE_ID
        );
        notification.success({
          message: `${selectedExpenseType?.name?.toUpperCase()} Expense transaction ${params.id ? "updated" : "added"
            }!`,
          description: `Expense transaction details has been ${params.id ? "updated" : "added"
            } successfully`,
        });
        navigate("/expense-transaction");
      } else {
        notification.error({
          message: `Failed to ${params.id ? "update" : "add"
            } expense transaction`,
        });
      }
    } catch (error) {
      console.log(error);
      notification.error({
        message: "An error occurred",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Fragment>
      {loading && <Loader />}

      <div className="page-content" style={{ padding: '16px' }}>
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '600' }}>
            {params.id ? 'Edit' : 'Add'} Expense Transaction
          </h2>
        </div>

        <div style={{ backgroundColor: '#fff', borderRadius: '8px' }}>
          <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
            onValuesChange={(_, allValues) => {
              const isEmpty = Object.values(allValues).every(
                (value) =>
                  value === undefined || value === null || value === ""
              );
              setIsFormEmpty(isEmpty);
            }}
          >
            <div className="form-grid">
              <Form.Item
                label={<span>Branch Name</span>}
                name="branch_id"
                rules={[
                  { required: true, message: "Please select a branch" },
                ]}
              >
                <Select
                  placeholder="Select Branch"
                  allowClear
                  optionFilterProp="children"
                >
                  {branchList?.map((branch) => (
                    <Select.Option key={branch.id} value={branch.id}>
                      {branch.branch_name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
              
              <Form.Item
                label={<span>Line Name</span>}
                name="line_id"
                rules={[
                  { required: true, message: "Please select a line" },
                ]}
              >
                <Select
                  placeholder="Select Line"
                  allowClear
                  optionFilterProp="children"
                >
                  {lineList?.map((line) => {
                    if (
                      form.getFieldValue("branch_id") === line?.branch
                    ) {
                      return (
                        <Select.Option key={line.id} value={line.id}>
                          {line.lineName}
                        </Select.Option>
                      );
                    }
                    return null;
                  })}
                </Select>
              </Form.Item>

              <Form.Item
                label={<span>Expense Type Name</span>}
                name="EXPNS_TYPE_ID"
                rules={[
                  {
                    required: true,
                    message: "Please select an expense type",
                  },
                ]}
              >
                <Select
                  placeholder="Select Expense Type"
                  allowClear
                  showSearch
                  optionFilterProp="children"
                >
                  {expenseTypeList?.map((type) => (
                    <Select.Option key={type.id} value={type.id}>
                      {type.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
              
              <Form.Item
                label={<span>Expense Amount</span>}
                name="EXPNS_TRNSCTN_AMNT"
                rules={[
                  { required: true, message: "Please enter an amount" },
                  {
                    pattern: /^[0-9]+(\.[0-9]{1,2})?$/,
                    message: "Enter a valid amount",
                  },
                ]}
              >
                <Input
                  placeholder="Enter Expense Amount"
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                />
              </Form.Item>

              <Form.Item
                label={<span>Payment Mode</span>}
                name="EXPNS_TRNSCTN_MODE"
                rules={[
                  {
                    required: true,
                    message: "Please select a payment mode",
                  },
                ]}
              >
                <Select placeholder="Select Payment Mode" allowClear>
                  {PAYMENT_MODES_OPTIONS.map((mode) => (
                    <Select.Option key={mode.value} value={mode.value}>
                      {mode.label}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
              
              <Form.Item
                label={<span>Date of Expense Transaction</span>}
                name="EXPNS_TRNSCTN_DT"
                rules={[
                  { required: true, message: "Please select a date" },
                ]}
              >
                <Input type="date" />
              </Form.Item>

              <Form.Item
                label="Remarks / Comments"
                name="EXPNS_TRNSCTN_RMRK"
                className="full-width"
              >
                <Input.TextArea placeholder="Enter remarks or comments" />
              </Form.Item>
            </div>

            <div className="d-flex justify-content-center gap-3 mt-4">
              <Button type="primary" htmlType="submit">
                {params.id ? "Update" : "Submit"}
              </Button>
              {!isFormEmpty && !params.id && (
                <Button
                  type="default"
                  onClick={() => {
                    form.resetFields();
                    setIsFormEmpty(true);
                  }}
                  icon={<ReloadOutlined />}
                >
                  Reset
                </Button>
              )}
              <Button
                type="default"
                onClick={() => navigate("/expense-transaction")}
              >
                Cancel
              </Button>
            </div>
          </Form>
        </div>
        <ToastContainer />
      </div>
    </Fragment>
  );
};

export default ExpenseTransactionForm;
