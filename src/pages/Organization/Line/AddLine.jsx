import { useEffect, useState, useCallback } from "react";
import { Form, Input, Button, Select, notification, Divider, Space } from "antd";
import { ToastContainer } from "react-toastify";
import Loader from "components/Common/Loader";
import { LINE, ADD_BRANCH } from "helpers/url_helper";
import { POST, GET } from "helpers/api_helper";
import { useParams } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from "helpers/errorMessages";
import "./AddLine.css";

const { Option } = Select;

const AddLine = () => {
  const [loader, setLoader] = useState(false);
  const [branchList, setBranchList] = useState([]);
  const [formData, setFormData] = useState({
    lineName: "",
    lineType: "",
    branch: "",
    installment: null,
    badinstallment: null,
  });
  const [branchLoader, setBranchLoader] = useState(false);
  const [form] = Form.useForm();
  const params = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    getBranchList();
  }, []);

  const getLineDetails = useCallback(async () => {
    try {
      setLoader(true);
      const response = await GET(`${LINE}${params.id}`);
      if (response?.status === 200) {
        setFormData(response?.data || []);
        form.setFieldsValue(response?.data);
      } else {
        setFormData([]);
      }
      setLoader(false);
    } catch (error) {
      setFormData([]);
      setLoader(false);
      console.log(error);
    }
  }, [params.id, form]);

  useEffect(() => {
    if (params.id) {
      getLineDetails();
    }
  }, [params.id, getLineDetails]);

  const getBranchList = async () => {
    try {
      setBranchLoader(true);
      const response = await GET(ADD_BRANCH);
      if (response?.status === 200) {
        setBranchList(response?.data);
      } else {
        setBranchList([]);
      }
      setBranchLoader(false);
    } catch (error) {
      setBranchList([]);
      setBranchLoader(false);
    }
  };

  const onFinish = async () => {
    setLoader(true);
    try {
      const response = await POST(LINE, formData);
      setLoader(false);
      if (response.status === 400) {
        notification.error({
          message: "Line",
          description:
            response?.data?.lineName?.[0] ||
            (params.id ? ERROR_MESSAGES.LINE.UPDATE_FAILED : ERROR_MESSAGES.LINE.CREATE_FAILED),
          duration: 0,
        });
        return;
      }

      setFormData({
        lineName: "",
        lineType: "",
        branch: "",
        installment: null,
        badinstallment: null,
      });
      form.setFieldsValue({
        lineName: "",
        lineType: "",
        branch: "",
        installment: null,
        badinstallment: null,
      });
      notification.success({
        message: `${response?.data?.lineName?.toUpperCase()} Line ${
          params.id ? "Update" : "Create"
        }!`,
        description: params.id 
          ? SUCCESS_MESSAGES.LINE.UPDATED 
          : SUCCESS_MESSAGES.LINE.CREATED,
        duration: 0,
      });

      navigate(`/line`);
    } catch (error) {
      notification.error({
        message: "Line",
        description: ERROR_MESSAGES.LINE.OPERATION_FAILED,
        duration: 0,
      });
    } finally {
      setLoader(false);
    }
  };

  const onValuesChange = (changedValues, allValues) => {
    setFormData({ ...formData, ...allValues });
  };

  const options = [
    { label: "Daily", value: "daily" },
    { label: "Weekly", value: "weekly" },
    { label: "Monthly", value: "monthly" },
  ];

  return (
    <>
      {loader && <Loader />}

      <div className="add-line-page-content">
        <div className="add-line-container-fluid">
          <div className="row">
            <div className="col-md-12">
              <div className="add-line-header">
                <h2 className="add-line-title">
                  {params.id ? "Edit Line" : "Add Line"}
                </h2>
              </div>

              <Form
                form={form}
                layout="vertical"
                onFinish={onFinish}
                onValuesChange={onValuesChange}
                initialValues={formData}
                className="add-line-form"
              >
                <div className="container add-line-form-container">
                  {/* Branch and Line Name */}
                  <div className="row mb-2">
                    <div className="col-md-6">
                      <Form.Item
                        label="Branch"
                        name="branch"
                        rules={[{ 
                          required: true, 
                          message: ERROR_MESSAGES.LINE.BRANCH_REQUIRED 
                        }]}
                      >
                        <Select
                          placeholder="Select Branch"
                          allowClear={!params.id}
                          showSearch
                          size="large"
                          loading={branchLoader}
                        >
                          {branchList.map((branch) => (
                            <Option key={branch.id} value={branch.id}>
                              {branch.branch_name}
                            </Option>
                          ))}
                        </Select>
                      </Form.Item>
                    </div>

                    <div className="col-md-6">
                      <Form.Item
                        label="Line Name"
                        name="lineName"
                        rules={[{ 
                          required: true, 
                          message: ERROR_MESSAGES.LINE.LINE_NAME_REQUIRED 
                        }]}
                      >
                        <Input placeholder="Enter line name" size="large" />
                      </Form.Item>
                    </div>
                  </div>

                  {/* Line Type & Installment */}
                  <div className="row mb-2">
                    <div className="col-md-6">
                      <Form.Item
                        label="Line Type"
                        name="lineType"
                        rules={[{ 
                          required: true, 
                          message: ERROR_MESSAGES.LINE.LINE_TYPE_REQUIRED 
                        }]}
                      >
                        <Select placeholder="Select Line Type" size="large">
                          {options.map((option) => (
                            <Option key={option.value} value={option.value}>
                              {option.label}
                            </Option>
                          ))}
                        </Select>
                      </Form.Item>
                    </div>

                    <div className="col-md-6">
                      <Form.Item
                        label="Installment"
                        name="installment"
                        rules={[
                          { 
                            required: true, 
                            message: ERROR_MESSAGES.LINE.INSTALLMENT_REQUIRED 
                          },
                        ]}
                      >
                        <Input
                          type="number"
                          placeholder="Enter number of installments"
                          size="large"
                        />
                      </Form.Item>
                    </div>
                  </div>

                  {/* Bad Installment */}
                  <div className="row mb-2">
                    <div className="col-md-6">
                      <Form.Item
                        label="No. of Bad Installments"
                        name="badinstallment"
                        rules={[
                          {
                            required: true,
                            message: ERROR_MESSAGES.LINE.BAD_INSTALLMENT_REQUIRED,
                          },
                        ]}
                      >
                        <Input
                          type="number"
                          placeholder="Enter bad installment count"
                          size="large"
                        />
                      </Form.Item>
                    </div>
                  </div>

                  <Divider className="add-line-divider" />

                  {/* Buttons */}
                  <div className="text-center mt-4">
                    <Space size="large">
                      <Button type="primary" htmlType="submit" size="large">
                        {params.id ? "Update Line" : "Add Line"}
                      </Button>

                      <Button
                        size="large"
                        onClick={() => navigate("/line")}
                      >
                        Cancel
                      </Button>
                    </Space>
                  </div>
                </div>
              </Form>
            </div>
          </div>
        </div>

        <ToastContainer />
      </div>
    </>
  );
};

export default AddLine;