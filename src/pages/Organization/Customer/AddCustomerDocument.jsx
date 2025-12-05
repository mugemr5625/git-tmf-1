import React, { useState, useEffect } from "react";
import { notification, Form, Input, Button, Upload, message, Divider, Space, Card, Spin, Modal, Alert } from "antd";
// Added CloseCircleOutlined
import { UploadOutlined, CloudUploadOutlined, FileOutlined, DeleteOutlined, EyeOutlined, PlusOutlined, MinusOutlined, CloseCircleOutlined } from '@ant-design/icons';
// Added DELETE helper
import { UPLOAD, GET, DELETE } from "helpers/api_helper";
import { useNavigate } from "react-router-dom";
const AddCustomerDocument = ({ customerId, onPrevious, onCancel }) => {
  const [form] = Form.useForm();

  // State for document fields - now arrays to support multiple uploads
  const [aadhaarFields, setAadhaarFields] = useState([{ id: 0, file: null, loading: false }]);
  const [panFields, setPanFields] = useState([{ id: 0, file: null, loading: false }]);
  const [locationFields, setLocationFields] = useState([{ id: 0, file: null, loading: false }]);
  const [otherFields, setOtherFields] = useState([{ id: 0, file: null, loading: false }]);

  // State for existing documents
  const [existingDocuments, setExistingDocuments] = useState([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);

   const navigate = useNavigate();
  // Set customer ID when component receives it
  useEffect(() => {
    if (customerId) {
      form.setFieldsValue({ customer_id: customerId });
      fetchExistingDocuments();
    }
  }, [customerId, form]);

  // Fetch existing documents
  const fetchExistingDocuments = async () => {
    setLoadingDocuments(true);
    try {
      const response = await GET(`/api/customer-documents/customer/${customerId}/documents/`);
      console.log('Fetched documents:', response);
      
      if (response && response.error) {
        console.log('No documents found or customer not found');
        setExistingDocuments([]);
        return;
      }
      
      if (response && Array.isArray(response.data)) {
        setExistingDocuments(response.data);
      } else if (response && Array.isArray(response)) {
        setExistingDocuments(response);
      } else {
        setExistingDocuments([]);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
      setExistingDocuments([]);
      if (!error.message?.includes('Customer not found')) {
        notification.error({
          message: 'Error',
          description: 'Failed to fetch existing documents',
          duration: 3,
        });
      }
    } finally {
      setLoadingDocuments(false);
    }
  };
  
  // === Handle deletion of an already uploaded document ===
  const handleDeleteDocument = async (docId, fileName) => {
    Modal.confirm({
      title: 'Confirm Delete',
      content: `Are you sure you want to delete the document: ${fileName || 'Document'}?`,
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        setLoadingDocuments(true);
        try {
          const response = await DELETE(`/api/customer-documents/${docId}/`);

          if (response?.status === 204 || response?.status === 200) {
            notification.success({
              message: 'Deleted',
              description: `${fileName || 'Document'} deleted successfully.`,
              duration: 3,
            });
            // Update the existing documents state
            setExistingDocuments(prev => prev.filter(doc => doc.id !== docId));
          } else {
            notification.error({
              message: 'Deletion Failed',
              description: response?.data?.error || 'Failed to delete the document.',
              duration: 3,
            });
          }
        } catch (error) {
          notification.error({
            message: 'Error',
            description: error.response?.data?.error || error.message || 'An error occurred during deletion.',
            duration: 3,
          });
        } finally {
          setLoadingDocuments(false);
        }
      },
    });
  };

  // Group documents by type
  const getDocumentsByType = (type) => {
    if (!Array.isArray(existingDocuments)) {
      return [];
    }
    return existingDocuments.filter(doc => doc.document_type === type);
  };

  // State for preview modal
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewContent, setPreviewContent] = useState(null);
  const [previewType, setPreviewType] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // View document
  const SecurePDFPreview = ({ url }) => {
    const googleViewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;

    return (
      <div style={{ margin: 0, padding: 0 }}>
        {/* Compact button section */}
        <div style={{ marginBottom: 8, display: 'flex', gap: 8 }}>
          <Button 
            type="primary" 
            size="small"
            onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
          >
            Open PDF in New Tab
          </Button>
        </div>
        
        {/* Compact alert */}
        {/* <Alert
          message="Using Google Docs Viewer for reliable preview."
          type="info"
          showIcon
          style={{ marginBottom: 8, padding: '4px 12px' }}
        /> */}

        {/* Full height iframe */}
        <iframe
          src={googleViewerUrl}
          title="PDF Preview"
          width="100%"
          height="600px"
          style={{ 
            border: '1px solid #d9d9d9', 
            borderRadius: 4,
            display: 'block',
            margin: 0
          }}
        />
      </div>
    );
  };

  const viewDocument = async (documentData, fileName) => {
    console.log('View document called:', documentData);
    console.log('File name:', fileName);
    
    // Handle if documentData is an object with file_url or other properties
    let documentUrl = documentData;
    let actualFileName = fileName;
    
    if (typeof documentData === 'object' && documentData !== null) {
      // Check for file_url first (your backend uses this)
      if (documentData.file_url) {
        documentUrl = documentData.file_url;
      }
      // Check for signed_url as fallback
      else if (documentData.signed_url) {
        documentUrl = documentData.signed_url;
      } 
      // Check for gcs_path or other URL properties
      else if (documentData.gcs_path) {
        notification.error({
          message: 'Error',
          description: 'Document URL not available. Please contact support.',
          duration: 3,
        });
        console.error('No file URL available for document:', documentData);
        return;
      }
      // Check if it has a url property
      else if (documentData.url) {
        documentUrl = documentData.url;
      }
      
      // Get filename from document_file object if available
      if (!actualFileName && documentData.document_file && documentData.document_file.original_name) {
        actualFileName = documentData.document_file.original_name;
      }
      // Or from document_file_name
      else if (!actualFileName && documentData.document_file_name) {
        actualFileName = documentData.document_file_name;
      }
    }
    
    if (!documentUrl || typeof documentUrl !== 'string') {
      notification.error({
        message: 'Error',
        description: 'Document URL not found or invalid',
        duration: 3,
      });
      console.error('Invalid document URL:', documentUrl);
      return;
    }

    // Determine file type from fileName or URL
    let fileExtension = '';
    if (actualFileName && typeof actualFileName === 'string') {
      fileExtension = actualFileName.split('.').pop().toLowerCase();
    } else if (typeof documentUrl === 'string') {
      // Extract extension from URL (before query parameters)
      const urlWithoutParams = documentUrl.split('?')[0];
      fileExtension = urlWithoutParams.split('.').pop().toLowerCase();
    }
    
    console.log('File extension:', fileExtension);
    console.log('Document URL:', documentUrl);
    
    // Set preview type and content
    if (fileExtension === 'pdf') {
      setPreviewType('pdf');
      setPreviewContent(documentUrl);
      setPreviewVisible(true);
      return;
    }

    // For images, show in modal with preview
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(fileExtension)) {
      setPreviewType('image');
      setPreviewContent(documentUrl);
      setPreviewVisible(true);
      setPreviewLoading(true);
      return;
    }

    // For other file types, try to open in new tab
    try {
      window.open(documentUrl, '_blank');
    } catch (error) {
      console.error('Error opening document:', error);
      notification.error({
        message: 'Error',
        description: 'Failed to open document',
        duration: 3,
      });
    }
  };


  
  // Add field handlers
  const addAadhaarField = () => {
    if (aadhaarFields.length < 2) {
      setAadhaarFields([...aadhaarFields, { id: Date.now(), file: null, loading: false }]);
    }
  };

  const addPanField = () => {
    if (panFields.length < 2) {
      setPanFields([...panFields, { id: Date.now(), file: null, loading: false }]);
    }
  };

  const addLocationField = () => {
    if (locationFields.length < 4) {
      setLocationFields([...locationFields, { id: Date.now(), file: null, loading: false }]);
    }
  };

  const addOtherField = () => {
    if (otherFields.length < 4) {
      setOtherFields([...otherFields, { id: Date.now(), file: null, loading: false }]);
    }
  };

  // Remove field handlers
  const removeAadhaarField = (id) => {
    if (aadhaarFields.length > 1) {
      setAadhaarFields(aadhaarFields.filter(field => field.id !== id));
    }
  };

  const removePanField = (id) => {
    if (panFields.length > 1) {
      setPanFields(panFields.filter(field => field.id !== id));
    }
  };

  const removeLocationField = (id) => {
    if (locationFields.length > 1) {
      setLocationFields(locationFields.filter(field => field.id !== id));
    }
  };

  const removeOtherField = (id) => {
    if (otherFields.length > 1) {
      setOtherFields(otherFields.filter(field => field.id !== id));
    }
  };

  // File upload handler
  const handleFileSelect = (file, fieldId, setFieldsState, fields) => {
    console.log('=== File Selected ===');
    console.log('File:', file);
    
    const originalFile = file.originFileObj || file;
    
    console.log('Original File:', originalFile);
    console.log('File.name:', originalFile.name);
    
    const updatedFields = fields.map(field => 
      field.id === fieldId ? { ...field, file: originalFile } : field
    );
    
    setFieldsState(updatedFields);
    message.success(`${originalFile.name} selected successfully`);
    return false;
  };
  
  // === Clears the locally selected file ===
  const handleClearFile = (fieldId, setFieldsState, fields) => {
    const updatedFields = fields.map(field => 
        field.id === fieldId ? { ...field, file: null } : field
    );
    setFieldsState(updatedFields);
    message.info('File selection cleared.');
  };

  // Upload individual document
  const uploadDocument = async (fieldId, file, type, descriptionField, setFieldsState, fields) => {
    console.log('=== Upload Document Called ===');
    console.log('File received:', file);
    console.log('Type:', type);
    console.log('Customer ID:', customerId);
    
    // IMPORTANT: Use field.id for unique description field name
    const description = form.getFieldValue(`${descriptionField}_${fieldId}`); 

    if (!customerId) {
      notification.error({
        message: 'Error',
        description: 'Customer ID is missing. Please complete personal information first.',
        duration: 3,
      });
      return;
    }

    if (!file) {
      notification.error({
        message: 'Error',
        description: 'Please select a file first',
        duration: 2,
      });
      return;
    }

    if (!(file instanceof File)) {
      console.error('File is not a File instance:', file);
      notification.error({
        message: 'Error',
        description: 'Invalid file object. Please select the file again.',
        duration: 3,
      });
      return;
    }

    // Set loading for this specific field
    const updatedFields = fields.map(field => 
      field.id === fieldId ? { ...field, loading: true } : field
    );
    setFieldsState(updatedFields);

    try {
      const formData = new FormData();
      formData.append('customer_id', String(customerId));
      formData.append('document_type', type);
      formData.append('document_description', description || `${type} document`);
      formData.append('document_file', file, file.name);

      console.log('=== Making UPLOAD Request ===');
      const response = await UPLOAD('/api/customer-documents/', formData);

      console.log('=== UPLOAD Response ===');
      console.log('Response:', response);

      // Reset loading state
      const resetFields = fields.map(field => 
        field.id === fieldId ? { ...field, loading: false } : field
      );
      setFieldsState(resetFields);

      if (response.status === 400) {
        const errorMessage = response?.data?.document_file?.[0] 
          || response?.data?.error 
          || response?.data?.message 
          || 'Failed to upload document';
        
        notification.error({
          message: 'Upload Failed',
          description: errorMessage,
          duration: 3,
        });
        return;
      }

      if (response.status === 201 || response.status === 200) {
        notification.success({
          message: 'Success',
          description: `${type} document uploaded successfully`,
          duration: 3,
        });
        
        // Clear the file after successful upload
        const clearedFields = fields.map(field => 
          field.id === fieldId ? { ...field, file: null } : field
        );
        setFieldsState(clearedFields);
        
        // Clear description field
        form.setFieldValue(`${descriptionField}_${fieldId}`, '');
        
        // Refresh documents list
        fetchExistingDocuments();
      }
    } catch (error) {
      console.error('=== Upload Error ===');
      console.error('Error:', error);
      
      // Reset loading state on error
      const resetFields = fields.map(field => 
        field.id === fieldId ? { ...field, loading: false } : field
      );
      setFieldsState(resetFields);
      
      notification.error({
        message: 'Upload Failed',
        description: error.response?.data?.error || error.message || 'An error occurred during upload',
        duration: 3,
      });
    }
  };

  const handleReset = () => {
    form.resetFields();
    setAadhaarFields([{ id: 0, file: null, loading: false }]);
    setPanFields([{ id: 0, file: null, loading: false }]);
    setLocationFields([{ id: 0, file: null, loading: false }]);
    setOtherFields([{ id: 0, file: null, loading: false }]);
  };

  // Render existing documents section
  const renderExistingDocuments = (type, title) => {
    const documents = getDocumentsByType(type);
    
    if (documents.length === 0) return null;

    return (
      <div style={{ marginBottom: '16px' }}>
        <div style={{ 
          fontSize: '13px', 
          fontWeight: '500', 
          marginBottom: '8px',
          color: '#666'
        }}>
          Existing {title}:
        </div>
        {documents.map((doc, index) => (
          <Card 
            key={doc.id || index}
            size="small" 
            style={{ marginBottom: '8px' }}
          >
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center' 
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileOutlined style={{ fontSize: '16px', color: '#1890ff' }} />
                <div>
                  <div style={{ fontWeight: '500' }}>
                    {doc.document_file_name || 'Document'}
                  </div>
                  {doc.document_description && (
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      {doc.document_description}
                    </div>
                  )}
                  <div style={{ fontSize: '11px', color: '#999' }}>
                    Uploaded: {new Date(doc.uploaded_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
              <Space>
                <Button 
                  type="link" 
                  icon={<EyeOutlined />}
                  onClick={() => viewDocument(doc, doc.document_file?.original_name)}
                  size="small"
                >
                  View
                </Button>
                <Button 
                  type="link" 
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => handleDeleteDocument(doc.id, doc.document_file_name)}
                  size="small"
                >
                  Delete
                </Button>
              </Space>
            </div>
          </Card>
        ))}
      </div>
    );
  };

  // Render document upload fields
 const renderDocumentFields = (fields, setFieldsState, type, descriptionFieldPrefix, addHandler, removeHandler, maxFields) => {
  return (
    <>
      {fields.map((field, index) => {
        // Truncate file name to 15 characters
        const fileName = field.file?.name || '';
        const truncatedFileName = fileName.length > 30
          ? fileName.substring(0, 30) + '...' 
          : fileName;

        return (
          <div key={field.id} className="row mb-3">
            <div className="col-md-6" style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
              
              <Form.Item label="File Upload" style={{ flexGrow: 1, marginBottom: 0 }}>
                
                {/* 1. Buttons (Browse & Upload) */}
                <Space.Compact style={{ width: '100%', marginBottom: field.file ? '8px' : '0' }}>
                  <Upload
                    maxCount={1}
                    multiple={false}
                    beforeUpload={(file) => handleFileSelect(file, field.id, setFieldsState, fields)}
                    accept=".pdf,.png,.jpeg,.jpg"
                    fileList={field.file ? [{
                      uid: field.id, 
                      name: field.file.name,
                      status: 'done',
                    }] : []}
                    showUploadList={false}
                    style={{ flex: 1 }}
                  >
                    <Button 
                      icon={<UploadOutlined />} 
                      style={{ 
                        width: '100%', 
                        textAlign: 'left', 
                        paddingLeft: '12px' 
                      }}
                    >
                      Browse
                    </Button>
                  </Upload>
                  
                  {/* The Upload button for starting the API call */}
                  <Button 
                    type="primary" 
                    icon={<CloudUploadOutlined />}
                    onClick={() => uploadDocument(field.id, field.file, type, descriptionFieldPrefix, setFieldsState, fields)}
                    loading={field.loading}
                    disabled={!field.file}
                    style={{ marginLeft: '0px' }} 
                  >
                    Upload
                  </Button>
                </Space.Compact>
                
                {/* 2. Selected File Name and Clear Button */}
                {field.file && (
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    padding: '4px 11px',
                    border: '1px solid #d9d9d9',
                    borderRadius: '6px',
                    backgroundColor: '#f6ffed'
                  }}>
                    <div 
                      style={{ 
                        fontSize: '13px', 
                        color: '#52c41a', 
                        fontWeight: '500',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: 'calc(100% - 30px)'
                      }}
                      title={fileName} // Show full name on hover
                    >
                      <FileOutlined style={{ marginRight: '5px' }} />
                      {truncatedFileName}
                    </div>
                    <Button
                      icon={<CloseCircleOutlined />} 
                      onClick={() => handleClearFile(field.id, setFieldsState, fields)}
                      danger
                      type="text"
                      size="small"
                      title="Clear selected file"
                      style={{ 
                        padding: '0', 
                        height: 'auto',
                        marginLeft: '8px'
                      }}
                    />
                  </div>
                )}
              </Form.Item>
              
              {/* The removal button */}
              {fields.length > 1 && (
                <Button
                  type="primary"
                  danger
                  shape="circle"
                  icon={<MinusOutlined />}
                  onClick={() => removeHandler(field.id)}
                  style={{
                    width: 35,
                    height: 35,
                    backgroundColor: 'red',
                    borderColor: 'red',
                    marginTop: 8
                  }}
                />
              )}
            </div>

            <div className="col-md-6">
              <Form.Item
                label="Description"
                name={`${descriptionFieldPrefix}_${field.id}`} 
              >
                <Input.TextArea
                  placeholder={`Enter ${type} description`}
                  autoSize={{ minRows: 1, maxRows: 6 }}
                  allowClear
                />
              </Form.Item>
            </div>
          </div>
        );
      })}

      {/* Add button */}
      {fields.length < maxFields && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
          <Button
            type="primary"
            shape="circle"
            icon={<PlusOutlined />}
            onClick={addHandler}
            style={{
              width: 35,
              height: 35,
              backgroundColor: '#28a745',
              borderColor: '#28a745',
              color: '#fff',
            }}
          />
        </div>
      )}
    </>
  );
};

  return (
    <div className="page-content" style={{
      marginRight: "10px",
      marginLeft: "-10px",
      maxWidth: "100%"
    }}>
      <div className="container-fluid" style={{
        marginTop: -100,
        padding: 0,
      }}>
        <div className="row">
          <div className="col-md-12">
            <Spin spinning={loadingDocuments} tip="Loading documents...">
              <Form 
                form={form} 
                layout="vertical"
                style={{ padding: 0, marginRight: "-20px", marginBottom: "-30px", marginTop: "20px" }}
              >
                <div className="container" style={{ padding: 0 }}>
                  
                  {/* Customer ID - Read Only */}
                  <div className="row mb-1 mt-2">
                    <div className="col-md-12">
                      <Form.Item
                        label="Customer ID"
                        name="customer_id"
                      >
                        <Input 
                          placeholder="Customer ID" 
                          size="large" 
                          disabled 
                          style={{ 
                            backgroundColor: '#f5f5f5',
                            color: '#000',
                            fontWeight: '600'
                          }}
                        />
                      </Form.Item>
                    </div>
                  </div>

                  {/* Aadhaar Document - Max 2 */}
                  <Divider style={{ borderTop: "2px solid #d9d9d9" }} />
                  <Divider orientation="center">Aadhaar Document</Divider>
                  
                  {renderExistingDocuments('aadhaar', 'Aadhaar Documents')}
                  
                  {renderDocumentFields(
                    aadhaarFields,
                    setAadhaarFields,
                    'aadhaar',
                    'aadhaar_description',
                    addAadhaarField,
                    removeAadhaarField,
                    2
                  )}

                  {/* PAN Document - Max 2 */}
                  <Divider style={{ borderTop: "2px solid #d9d9d9" }} />
                  <Divider orientation="center">PAN Document </Divider>
                  
                  {renderExistingDocuments('pan', 'PAN Documents')}
                  
                  {renderDocumentFields(
                    panFields,
                    setPanFields,
                    'pan',
                    'pan_description',
                    addPanField,
                    removePanField,
                    2
                  )}

                  {/* Location Document - Max 4 */}
                  <Divider style={{ borderTop: "2px solid #d9d9d9" }} />
                  <Divider orientation="center">Location Document </Divider>
                  
                  {renderExistingDocuments('location_photo', 'Location Documents')}
                  
                  {renderDocumentFields(
                    locationFields,
                    setLocationFields,
                    'location_photo',
                    'location_description',
                    addLocationField,
                    removeLocationField,
                    4
                  )}

                  {/* Other Document - Max 4 */}
                  <Divider style={{ borderTop: "2px solid #d9d9d9" }} />
                  <Divider orientation="center">Other Document </Divider>
                  
                  {renderExistingDocuments('other', 'Other Documents')}
                  
                  {renderDocumentFields(
                    otherFields,
                    setOtherFields,
                    'other',
                    'other_description',
                    addOtherField,
                    removeOtherField,
                    4
                  )}

                  <Divider style={{ borderTop: "2px solid #d9d9d9" }} />

                  {/* Action Buttons */}
                  <div className="text-center mt-4" style={{ 
                    display: 'flex',
                    justifyContent: 'center',
                    marginBottom: '20px',
                    gap: '10px' 
                  }}>
                    <Button
                      type="primary"
                      size="large"
                      onClick={onPrevious}
                    >
                      Previous
                    </Button>
                    <Button size="large" 
                    onClick={() => {
                      navigate("/view-customer");
                    }}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </Form>
            </Spin>

            {/* Preview Modal for Images */}
          <Modal
  open={previewVisible}
  title="Document Preview"
  footer={[
    <Button key="close" onClick={() => setPreviewVisible(false)}>
      Close
    </Button>,
    <Button 
      key="download" 
      type="primary"
      onClick={() => window.open(previewContent, '_blank')}
    >
      Open in New Tab
    </Button>
  ]}
  onCancel={() => setPreviewVisible(false)}
  width={900}
  centered
  destroyOnClose
  bodyStyle={{ padding: '16px', margin: 0 }}
  style={{ top: 20 }}
>
  <Spin spinning={previewLoading && previewType === 'image'}>
    {previewType === 'pdf' && previewContent && (
      <SecurePDFPreview url={previewContent} />
    )}
    
    {previewType === 'image' && previewContent && (
      <div style={{ textAlign: 'center' }}>
        <img 
          src={previewContent} 
          alt="Document Preview" 
          style={{ 
            maxWidth: '100%', 
            maxHeight: '70vh',
            objectFit: 'contain'
          }}
          onLoad={() => setPreviewLoading(false)}
          onError={(e) => {
            console.error('Image load error:', e);
            setPreviewLoading(false);
            notification.error({
              message: 'Error',
              description: 'Failed to load image',
              duration: 3,
            });
          }}
        />
      </div>
    )}
  </Spin>
</Modal>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddCustomerDocument;