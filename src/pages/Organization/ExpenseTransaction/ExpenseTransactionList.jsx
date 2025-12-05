import {
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import {
  Button,
  DatePicker,
  FloatButton,
  Form,
  Modal,
  notification,
  Select
} from "antd";
import GenericCollapse from "components/Common/Collapse";
import Loader from "components/Common/Loader";
import dayjs from "dayjs";
import { DELETE } from "helpers/api_helper";
import { getList } from "helpers/getters";
import { EXPENSE_TRANSACTION, EXPENSE_TYPES } from "helpers/url_helper";
import { useEffect, useState } from "react";
import SwipeablePanel from "components/Common/SwipeablePanel";

// Import responsive CSS
import "./ExpenseTransactionList.css";

const ExpenseTransactionList = () => {
  const [form] = Form.useForm();
  const [searchForm] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [expenseTransactions, setExpenseTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [expenseTypeList, setExpenseTypeList] = useState([]);
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    Promise.all([getExpenseTransactionList(), getList(EXPENSE_TYPES)]).then(
      ([transactionsRes, expenseTypesRes]) => {
        setExpenseTransactions(transactionsRes);
        setFilteredTransactions(transactionsRes);
        setExpenseTypeList(expenseTypesRes);
        setLoading(false);
      }
    );
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const getExpenseTransactionList = async () => {
    try {
      const response = await getList(EXPENSE_TRANSACTION);
      return response;
    } catch (error) {
      notification.error({
        message: "Failed to fetch expense transactions",
        description: "An error occurred while loading expense transaction data",
      });
      return [];
    }
  };

  const handleDelete = async (record) => {
    try {
      const response = await DELETE(
        `${EXPENSE_TRANSACTION}${record.EXPNS_TRNSCTN_ID}/`
      );
      if (response.status === 204) {
        const updated = expenseTransactions.filter(
          (item) => item.EXPNS_TRNSCTN_ID !== record.EXPNS_TRNSCTN_ID
        );
        setExpenseTransactions(updated);
        applyFilters(form.getFieldsValue(), updated);
        notification.success({
          message: `${record.EXPNS_TYPE_NM?.toUpperCase()} Expense transaction deleted!`,
          description:
            "Expense transaction details has been deleted successfully",
        });
      } else {
        notification.error({
          message: "Failed to delete expense transaction",
          description:
            "An error occurred while deleting the expense transaction",
        });
      }
    } catch (error) {
      notification.error({
        message: "An error occurred",
        description: "Failed to delete expense transaction",
      });
    }
  };

  const applyFilters = (values, data = expenseTransactions) => {
    console.log("Data to the apply filter",data)
    console.log("values to the apply filter",values)

    let filtered = [...data];
    if (values.expenseType && values.expenseType.length > 0) {
      filtered = filtered.filter(
        (item) => values.expenseType.includes(item.EXPNS_TYPE_NM)
      );
    }
    if (values.fromDate) {
      filtered = filtered.filter((item) =>
        dayjs(item.EXPNS_TRNSCTN_DT).isAfter(
          dayjs(values.fromDate).subtract(1, "day")
        )
      );
    }
    if (values.toDate) {
      filtered = filtered.filter((item) =>
        dayjs(item.EXPNS_TRNSCTN_DT).isBefore(
          dayjs(values.toDate).add(1, "day")
        )
      );
    }

    setFilteredTransactions(filtered);
  };

  const handleSearch = () => {
    const values = searchForm.getFieldsValue();
    applyFilters(values);
    setSearchModalVisible(false);
  };

  const handleReset = () => {
    searchForm.resetFields();
    setFilteredTransactions(expenseTransactions);
    setSearchModalVisible(false);
  };

  const showSearchModal = () => {
    setSearchModalVisible(true);
  };

  return (
    <div className="page-content" style={{ padding: '16px' }}>
      {loading && <Loader />}

      {/* Page Title with Search Button */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '24px' 
      }}>
        <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '600' }}>Expense Transactions</h2>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center',  border: '1px solid #ccc', borderRadius: '6px',  }}>
          <Button
            type="normal"
            icon={<SearchOutlined />}
            onClick={showSearchModal}
            className="search-button"
          >
            <span className="search-text">Search</span>
          </Button>
          {filteredTransactions.length !== expenseTransactions.length && (
            <Button 
              icon={<ReloadOutlined />} 
              onClick={handleReset}
              title="Reset Search"
            />
          )}
        </div>
      </div>

      <Modal
        title="Search Expense Transactions"
        open={searchModalVisible}
        onOk={handleSearch}
        onCancel={() => setSearchModalVisible(false)}
        okText="Search"
        cancelText="Cancel"
        width={600}
      >
        <Form form={searchForm} layout="vertical">
          <Form.Item label="Expense Type Name" name="expenseType">
            <Select
              mode="multiple"
              showSearch
              allowClear
              placeholder="Select Expense Types"
              style={{ width: '100%' }}
              filterOption={(input, option) =>
                (option?.label ?? "")
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
              options={expenseTypeList.map((type) => ({
                label: type.name,
                value: type.name,
              }))}
            />
          </Form.Item>

          <Form.Item label="From Date" name="fromDate">
            <DatePicker
              placeholder="Select From Date"
              style={{ width: '100%' }}
              format="DD/MM/YYYY"
            />
          </Form.Item>

          <Form.Item label="To Date" name="toDate">
            <DatePicker
              placeholder="Select To Date"
              style={{ width: '100%' }}
              format="DD/MM/YYYY"
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Floating Add Button */}
      <FloatButton
        icon={<PlusOutlined />}
        type="primary"
        style={{
          right: 24,
          bottom: 24,
          width: 56,
          height: 56,
        }}
        onClick={() => window.location.href = '/expense-transaction/add'}
        tooltip="Add New Expense Transaction"
      />

      <GenericCollapse
        titleKey="expense_transaction_expense_type"
        data={filteredTransactions}
        contentKeys={[
          "expense_transaction_branch",
          "expense_transaction_line",
          "expense_transaction_expense_type",
          "expense_transaction_amount",
          "expense_transaction_payment_mode",
          "expense_transaction_date",
          "expense_transaction_remarks",
        ]}
        onDelete={handleDelete}
        name="expense-transaction"
        ItemComponent={isMobile ? SwipeablePanel : undefined}
      />
    </div>
  );
};

export default ExpenseTransactionList;
