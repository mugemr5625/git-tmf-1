import { useEffect, useState } from "react";
import { Form, Input, Button, Select, notification, Divider, Space } from "antd";
import { ToastContainer } from "react-toastify";
import Loader from "components/Common/Loader";
import { LINE, ADD_BRANCH, AREA } from "helpers/url_helper";
import { POST, GET } from "helpers/api_helper";
import { useParams, useNavigate } from "react-router-dom";
import { ERROR_MESSAGES, SUCCESS_MESSAGES, NOTIFICATION_TITLES } from "helpers/errorMessages";
import "./AddArea.css";

const { Option } = Select;

const AddArea = () => {
  const [loader, setLoader] = useState(false);
  const [branchList, setBranchList] = useState([]);
  const [lineList, setLineList] = useState([]);
  const [formData, setFormData] = useState({
    line_id: "",
    areaName: "",
    branch_id: "",
  });
  const [branchLoader, setBranchLoader] = useState(false);
  const [lineLoader, setLineLoader] = useState(false);
  const [form] = Form.useForm();
  const params = useParams();
  const navigate = useNavigate();
  const [selectedBranch, setSelectedBranch] = useState(null);

  useEffect(() => {
    getBranchList();
  }, []);

  // Set branch from localStorage after branch list is loaded
  useEffect(() => {
    if (branchList.length > 0 && !params.id) {
      const storedBranchName = localStorage.getItem('selected_branch_name');
      
      if (storedBranchName) {
        // Find the branch from branchList that matches the stored name
        const matchedBranch = branchList.find(
          branch => branch.branch_name === storedBranchName
        );
        
        if (matchedBranch) {
          setSelectedBranch(matchedBranch);
          setFormData(prev => ({ ...prev, branch_id: matchedBranch.id }));
          form.setFieldsValue({ branch_id: matchedBranch.id });
        }
      }
    }
  }, [branchList, params.id, form]);

  useEffect(() => {
    if (params.id) {
      getAreaDetails();
    }
  }, [params.id]);

  // Fetch lines when branch is selected
  useEffect(() => {
    if (formData?.branch_id) {
      getLineList(formData.branch_id);
    }
  }, [formData?.branch_id]);

  const getAreaDetails = async () => {
    try {
      setLoader(true);
      const response = await GET(`${AREA}${params.id}`);
      if (response?.status === 200) {
        setFormData(response?.data || []);
        form.setFieldsValue(response?.data);
        const updatedData = {
          ...response?.data,
          line_id: response?.data?.lineid,
          branch_id: response?.data?.branchid,
        };
        delete updatedData?.lineid;
        delete updatedData?.branchid;
        setFormData(updatedData || []);
        form.setFieldsValue(updatedData);
      } else {
        setFormData([]);
      }
      setLoader(false);
    } catch (error) {
      setFormData([]);
      setLoader(false);
      console.log(error);
    }
  };

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

  const getLineList = async (branchId = null) => {
    try {
      setLineLoader(true);
      const response = await GET(LINE);
      if (response?.status === 200) {
        // Filter lines by branch if branchId is provided
        if (branchId) {
          const filteredLines = response?.data?.filter(
            (line) => line?.branch === branchId
          );
          setLineList(filteredLines);
        } else {
          setLineList(response?.data);
        }
      } else {
        setLineList([]);
      }
      setLineLoader(false);
    } catch (error) {
      setLineList([]);
      setLineLoader(false);
    }
  };

  const onFinish = async () => {
    setLoader(true);
    try {
      const response = await POST(AREA, formData);
      setLoader(false);
      if (response.status >= 400) {
        notification.error({
          message: NOTIFICATION_TITLES.AREA,
          description: params?.id 
            ? ERROR_MESSAGES.AREA.UPDATE_FAILED 
            : ERROR_MESSAGES.AREA.CREATE_FAILED,
          duration: 0,
        });
        return;
      }
      
      setFormData({
        line_id: "",
        areaName: "",
        branch_id: "",
      });
      form.setFieldsValue({
        line_id: "",
        areaName: "",
        branch_id: "",
      });
      
      notification.success({
        message: `${formData?.areaName?.toUpperCase()} ${NOTIFICATION_TITLES.AREA} ${
          params.id ? "Update" : "Create"
        }!`,
        description: params?.id 
          ? SUCCESS_MESSAGES.AREA.UPDATED 
          : SUCCESS_MESSAGES.AREA.CREATED,
        duration: 0,
      });

      navigate(`/area`);
    } catch (error) {
      notification.error({
        message: NOTIFICATION_TITLES.AREA,
        description: ERROR_MESSAGES.AREA.OPERATION_FAILED,
        duration: 0,
      });
    } finally {
      setLoader(false);
    }
  };

  const onValuesChange = (changedValues, allValues) => {
    if (changedValues?.branch_id) {
      // Clear line selection when branch changes
      setFormData({ ...formData, ...allValues, line_id: "" });
      form.setFieldsValue({
        line_id: "",
      });
      // Fetch lines for the new branch
      getLineList(allValues.branch_id);
      return;
    }
    setFormData({ ...formData, ...allValues });
  };

  return (
    <>
      {loader && <Loader />}

      <div className="add-area-page-content">
        <div className="add-area-container-fluid">
          <div className="row">
            <div className="col-md-12">
              <div className="add-area-header">
                <h2 className="add-area-title">
                  {params.id ? "Edit Area" : "Add Area"}
                </h2>
              </div>

              <Form
                form={form}
                layout="vertical"
                onFinish={onFinish}
                onValuesChange={onValuesChange}
                initialValues={formData}
                className="add-area-form"
              >
                <div className="container add-area-form-container">
                  {/* Branch and Line */}
                  <div className="row mb-2">
                    <div className="col-md-6">
                      <Form.Item
                        label="Branch"
                        name="branch_id"
                        rules={[
                          {
                            required: true,
                            message: ERROR_MESSAGES.AREA.BRANCH_REQUIRED,
                          },
                        ]}
                      >
                        <Select
                          placeholder="Select Branch"
                          allowClear={false}
                          showSearch
                          size="large"
                          loading={branchLoader}
                          disabled={true}
                        >
                          {branchList?.map((branch) => (
                            <Option key={branch?.id} value={branch?.id}>
                              {branch?.branch_name}
                            </Option>
                          ))}
                        </Select>
                      </Form.Item>
                    </div>

                    <div className="col-md-6">
                      <Form.Item
                        label="Line"
                        name="line_id"
                        rules={[
                          {
                            required: true,
                            message: ERROR_MESSAGES.AREA.LINE_REQUIRED,
                          },
                        ]}
                      >
                        <Select
                          placeholder="Select Line"
                          allowClear={!params.id}
                          showSearch
                          size="large"
                          loading={lineLoader}
                          disabled={!formData?.branch_id}
                        >
                          {lineList?.map((line) => (
                            <Option key={line?.id} value={line?.id}>
                              {line?.lineName}
                            </Option>
                          ))}
                        </Select>
                      </Form.Item>
                    </div>
                  </div>

                  {/* Area Name */}
                  <div className="row mb-2">
                    <div className="col-md-6">
                      <Form.Item
                        label="Area Name"
                        name="areaName"
                        rules={[
                          {
                            required: true,
                            message: ERROR_MESSAGES.AREA.AREA_NAME_REQUIRED,
                          },
                        ]}
                      >
                        <Input placeholder="Enter area name" size="large" />
                      </Form.Item>
                    </div>
                  </div>

                  <Divider className="add-area-divider" />

                  {/* Buttons */}
                  <div className="text-center mt-4">
                    <Space size="large">
                      <Button type="primary" htmlType="submit" size="large">
                        {params.id ? "Update Area" : "Add Area"}
                      </Button>

                      <Button
                        size="large"
                        onClick={() => navigate("/area")}
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

export default AddArea;