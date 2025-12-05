import { useState, useEffect } from "react";
import { notification, Form, Input, Button, Upload, message, Divider, Space } from "antd";
import { UploadOutlined, PlusOutlined, MinusOutlined } from '@ant-design/icons';
import { ToastContainer } from "react-toastify";
import Loader from "components/Common/Loader";
import { ADD_BRANCH, BRANCH_FILE } from "helpers/url_helper";
import { UPLOAD_CERTIFCATE, GET_BRANCHES, CREATE_BRANCH } from "helpers/api_helper";
import { useParams, useNavigate } from "react-router-dom";
import { ERROR_MESSAGES, SUCCESS_MESSAGES, NOTIFICATION_TITLES, FILE_MESSAGES } from "helpers/errorMessages";

const AddBranch = () => {
  const [loader, setLoader] = useState(false);
  const [form] = Form.useForm();
  const params = useParams();
  const navigate = useNavigate();

  const [agreementFile, setAgreementFile] = useState(null);
  const [additionalFiles, setAdditionalFiles] = useState([]);

  const getBranchDetails = async () => {
    setLoader(true);
    const response = await GET_BRANCHES(`${ADD_BRANCH}${params.id}`);
    if (response.status === 200) {
      const { data } = response;
      const agreementFileList = data.agreement_certificate[0]
        ? [
          {
            uid: '-1',
            name: data.agreement_certificate[0].file_name,
            status: 'done',
            url: data.agreement_certificate[0].signed_url,
          },
        ]
        : [];
      const additionalCertificateDetails = data.additional_details.map((file, index) => ({
        additional_certificate: file
          ? [
            {
              uid: `-${index + 1}`,
              name: file.file_name,
              status: 'done',
              url: file.signed_url,
            },
          ]
          : [],
        additional_certifi_description: file?.additional_certifi_description || '',
      }));
      form.setFieldsValue({
        ...data,
        agreement_certificate: agreementFileList,
        additional_certificate_details: additionalCertificateDetails,
      });

      setAgreementFile(response?.data.agreement_certificate[0] || null);
      setAdditionalFiles(response?.data.additional_details || []);
    }
    setLoader(false);
  };
  
  useEffect(() => {
    if (params?.id) {
      getBranchDetails();
    } else {
      form.setFieldsValue({
        additional_certificate_details: [
          {
            additional_certificate: [],
            additional_certifi_description: "",
          },
        ],
      });
      setAdditionalFiles([null]);
    }
  }, [params?.id]);

  const uploadFile = async (file, onSuccess, onError, isAdditional = false, index = null) => {
    const formData = new FormData();
    const blob = new Blob([file], { type: file.type });
    formData.append('file', blob, file.name);
    try {
      const response = await UPLOAD_CERTIFCATE(BRANCH_FILE, formData);
      if (response.status === 200) {
        const { signed_url, file_name } = response.data;
        if (isAdditional && index !== null) {
          setAdditionalFiles(prev => {
            const newFiles = [...prev];
            newFiles[index] = { signed_url, file_name };
            return newFiles;
          });
        } else {
          setAgreementFile({ signed_url, file_name });
        }
        message.success(`${file.name} ${FILE_MESSAGES.UPLOAD_SUCCESS}`);
        onSuccess('ok');
      } else throw new Error(response.statusText || ERROR_MESSAGES.BRANCH.UPLOAD_FAILED);
    } catch (error) {
      message.error(`${file.name} ${FILE_MESSAGES.UPLOAD_FAILED}`);
      onError(error);
    }
  };

  const onFinish = async values => {
    setLoader(true);
    try {
      const payload = {
        branch_name: values.branch_name,
        branch_address: values.branch_address,
        agreement_certificate: agreementFile ? [agreementFile] : [],
        agreement_description: values.agreement_description,
        additional_details: additionalFiles.map((file, index) => ({
          ...file,
          additional_certifi_description:
            values.additional_certificate_details[index]?.additional_certifi_description,
        })),
      };
      if (params.id) payload.id = params.id;

      const response = await CREATE_BRANCH(ADD_BRANCH, payload);
      if (response.status === 200 || response.status === 201) {
        notification.success({
          message: params.id ? NOTIFICATION_TITLES.BRANCH : NOTIFICATION_TITLES.BRANCH,
          description: params.id ? SUCCESS_MESSAGES.BRANCH.UPDATED : SUCCESS_MESSAGES.BRANCH.CREATED,
          duration: 2,
        });
        navigate("/branch/list");
      }
    } catch (error) {
      notification.error({
        message: ERROR_MESSAGES.BRANCH.OPERATION_FAILED,
        description: error.message,
        duration: 0,
      });
    } finally {
      setLoader(false);
    }
  };

  const fileRemove = () => {
    setAgreementFile(null);
    form.setFieldsValue({ agreement_description: "" });
  };

  const additioanRemove = (file) => {
    const index = form
      .getFieldValue("additional_certificate_details")
      .findIndex(detail => detail.additional_certificate[0]?.uid === file.uid);
    if (index !== -1) {
      setAdditionalFiles(prev => prev.map((item, i) => (i === index ? null : item)));
      const updatedDetails = form
        .getFieldValue("additional_certificate_details")
        .map((item, i) => (i === index ? {} : item));
      form.setFieldsValue({ additional_certificate_details: updatedDetails });
    }
  };

  return (
    <>
      {loader && <Loader />}

      <div className="page-content" style={{
        marginRight: "10px",
        marginLeft: "-10px", maxWidth: "100%"
      }}>
        <div className="container-fluid" style={{
          marginTop: -100,
          padding: 0,
        }}>
          <div className="row">
            <div className="col-md-12">
              <h2 style={{ margin: 0, fontSize: "24px", fontWeight: 600 }}>
                {params.id ? "Edit Branch" : "Add Branch"}
              </h2>

              <Form form={form} layout="vertical" onFinish={onFinish} style={{ padding: 0, marginRight: "-20px", marginBottom: "-30px" }}>
                <div className="container" style={{ padding: 0 }}>
                  {/* Branch Details */}
                  <div className="row mb-1 mt-2">
                    <div className="col-md-6">
                      <Form.Item
                        label="Branch Name"
                        name="branch_name"
                        rules={[{ required: true, message: ERROR_MESSAGES.BRANCH.BRANCH_NAME_REQUIRED }]}
                      >
                        <Input placeholder="Enter branch name" size="large" />
                      </Form.Item>
                    </div>
                    <div className="col-md-6">
                      <Form.Item
                        label="Branch Address"
                        name="branch_address"
                        rules={[{ required: true, message: ERROR_MESSAGES.BRANCH.BRANCH_ADDRESS_REQUIRED }]}
                      >
                        <Input.TextArea
                          placeholder="Enter branch address"
                          rows={3}
                          allowClear
                          autoSize={{ minRows: 2, maxRows: 8 }}
                          style={{ resize: "both" }}
                        />
                      </Form.Item>
                    </div>
                  </div>

                  {/* Agreement Certificate */}
                  <Divider style={{ borderTop: "2px solid #d9d9d9" }} />
                  <Divider orientation="center">Agreement</Divider>
                  <div className="row mb-3">
                    <div className="col-md-6">
                      <Form.Item
                        label="File Upload"
                        name="agreement_certificate"
                        rules={[{ required: true, message: ERROR_MESSAGES.BRANCH.AGREEMENT_CERTIFICATE_REQUIRED }]}
                        valuePropName="fileList"
                        getValueFromEvent={e => e && e.fileList}
                      >
                        <Upload
                          maxCount={1}
                          multiple={false}
                          customRequest={({ file, onSuccess, onError }) =>
                            uploadFile(file, onSuccess, onError)
                          }
                          onRemove={fileRemove}
                          fileList={form.getFieldValue("agreement_certificate")}
                          accept=".pdf,.csv,.png,.jpeg,.jpg,.doc,.docx"
                        >
                          <Button icon={<UploadOutlined />}>Upload</Button>
                        </Upload>
                      </Form.Item>
                    </div>
                    <div className="col-md-6">
                      <Form.Item
                        label="File Description"
                        name="agreement_description"
                        rules={[{ required: true, message: ERROR_MESSAGES.BRANCH.AGREEMENT_DESCRIPTION_REQUIRED }]}
                      >
                        <Input.TextArea
                          placeholder="Enter file description"
                          autoSize={{ minRows: 1, maxRows: 6 }}
                          allowClear
                        />
                      </Form.Item>
                    </div>
                  </div>
                  <Divider style={{ borderTop: "2px solid #d9d9d9" }} />

                  {/* Certificates Section */}
                  <Divider orientation="center">Certificates</Divider>
                  <Form.List name="additional_certificate_details">
                    {(fields, { add, remove }) => (
                      <>
                        {fields.map(({ key, name, ...restField }, index) => (
                          <div key={key} className="row mb-4">
                            {fields.length > 1 && (
                              <Divider orientation="center">
                                {`Additional Certificate ${index + 1}`}
                              </Divider>
                            )}

                            {/* File Upload */}
                            <div className="col-md-6">
                              <Form.Item
                                {...restField}
                                name={[name, "additional_certificate"]}
                                rules={[{ required: true, message: ERROR_MESSAGES.BRANCH.FILE_REQUIRED }]}
                                valuePropName="fileList"
                                getValueFromEvent={e => e && e.fileList}
                                label="File Upload"
                              >
                                <Upload
                                  maxCount={1}
                                  customRequest={({ file, onSuccess, onError }) =>
                                    uploadFile(file, onSuccess, onError, true, index)
                                  }
                                  accept=".pdf,.csv,.png,.jpeg,.jpg,.doc,.docx"
                                  onRemove={additioanRemove}
                                  fileList={form.getFieldValue([
                                    "additional_certificate_details",
                                    index,
                                    "additional_certificate",
                                  ])}
                                >
                                  <Button icon={<UploadOutlined />}>Upload</Button>
                                </Upload>
                              </Form.Item>
                            </div>

                            {/* File Description + Buttons */}
                            <div className="col-md-6">
                              <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                                <Form.Item
                                  {...restField}
                                  name={[name, "additional_certifi_description"]}
                                  rules={[{ required: true, message: ERROR_MESSAGES.BRANCH.FILE_DESCRIPTION_REQUIRED }]}
                                  label="File Description"
                                  style={{ flexGrow: 1 }}
                                >
                                  <Input.TextArea
                                    placeholder="Enter file description"
                                    autoSize={{ minRows: 1, maxRows: 6 }}
                                    allowClear
                                  />
                                </Form.Item>

                                {/* Minus Button */}
                                {index > 0 && (
                                  <Button
                                    type="primary"
                                    danger
                                    shape="circle"
                                    icon={<MinusOutlined />}
                                    onClick={() => {
                                      remove(name);
                                      setAdditionalFiles(prev => prev.filter((_, i) => i !== index));
                                    }}
                                    style={{
                                      width: 33,
                                      height: 33,
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      backgroundColor: "#ff4d4f",
                                      borderColor: "#ff4d4f",
                                      color: "#fff",
                                      marginTop: "25px",
                                    }}
                                  />
                                )}
                              </div>
                            </div>
                          </div>
                        ))}

                        {/* Add button */}
                        <div style={{ display: "flex", justifyContent: "flex-end" }}>
                          <Button
                            type="primary"
                            shape="circle"
                            icon={<PlusOutlined />}
                            onClick={() => {
                              add();
                              setAdditionalFiles(prev => [...prev, null]);
                            }}
                            style={{
                              width: 35,
                              height: 35,
                              backgroundColor: "#28a745",
                              borderColor: "#28a745",
                              color: "#fff",
                              marginTop: "-15px"
                            }}
                          />
                        </div>
                      </>
                    )}
                  </Form.List>

                  {/* Submit & Cancel Buttons */}
                  <div className="text-center mt-4">
                    <Space size="large">
                      <Button
                        type="primary"
                        htmlType="submit"
                        size="large"
                      >
                        {params.id ? "Update Branch" : "Add Branch"}
                      </Button>
                      <Button
                        size="large"
                        onClick={() => navigate("/branch/list")}
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

export default AddBranch;