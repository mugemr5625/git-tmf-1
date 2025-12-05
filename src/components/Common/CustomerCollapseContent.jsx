import React, { useState, useEffect } from "react";
import { Descriptions, Modal, Button, Alert, Spin, Tag } from "antd";
import pdfIcon from "../../assets/icons/pdf.png";
import imageIcon from "../../assets/icons/image.png";
import excelIcon from "../../assets/icons/excel.png";
import wordIcon from "../../assets/icons/word.png";
import defaultIcon from "../../assets/icons/default.png";

// ========== SECURITY CONFIGURATION ==========
const ALLOWED_DOMAINS = [
  'storage.googleapis.com',
  'storage.cloud.google.com',
];

const BLOCKED_EXTENSIONS = ['svg', 'xml', 'html', 'htm', 'js', 'exe', 'bat', 'sh', 'scr', 'vbs'];

// ========== SECURITY UTILITIES ==========
const isUrlSafe = (url) => {
  try {
    const urlObj = new URL(url);
    
    if (urlObj.protocol !== 'https:') {
      return { safe: false, reason: 'Only HTTPS URLs are allowed' };
    }
    
    const isAllowed = ALLOWED_DOMAINS.some(domain => 
      urlObj.hostname === domain || urlObj.hostname.endsWith(`.${domain}`)
    );
    
    if (!isAllowed) {
      return { safe: false, reason: 'URL not from trusted domain' };
    }
    
    if (urlObj.hostname.includes('googleapis.com')) {
      const hasRequiredParams = urlObj.searchParams.has('Expires') && 
                                urlObj.searchParams.has('GoogleAccessId') && 
                                urlObj.searchParams.has('Signature');
      if (!hasRequiredParams) {
        return { safe: false, reason: 'Invalid signed URL format' };
      }
      
      const expires = parseInt(urlObj.searchParams.get('Expires'));
      const now = Math.floor(Date.now() / 1000);
      if (expires < now) {
        return { safe: false, reason: 'Signed URL has expired' };
      }
    }
    
    return { safe: true };
  } catch (e) {
    return { safe: false, reason: 'Invalid URL format' };
  }
};

const getFileTypeFromUrl = (url) => {
  if (!url) return "unknown";
  
  const cleanUrl = url.split("?")[0].toLowerCase();
  const pathParts = cleanUrl.split('/');
  const filename = pathParts[pathParts.length - 1];
  const extension = filename.split('.').pop();
  
  if (BLOCKED_EXTENSIONS.includes(extension)) {
    return "blocked";
  }
  
  if (extension === 'pdf') return "pdf";
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(extension)) return "image";
  if (['xls', 'xlsx', 'csv'].includes(extension)) return "excel";
  if (['doc', 'docx'].includes(extension)) return "word";
  if (['mp4', 'mov', 'avi', 'webm'].includes(extension)) return "video";
  
  return "unknown";
};

const verifyContentType = async (url) => {
  try {
    const extension = getFileTypeFromUrl(url);
    
    if (extension === "blocked") {
      return { safe: false, reason: 'Blocked file type for security' };
    }
    
    return { 
      safe: true, 
      type: extension,
      skipVerification: true
    };
    
  } catch (error) {
    console.error('Content-Type verification failed:', error);
    return { safe: true, type: 'unknown', warning: 'Could not verify file type' };
  }
};

// ========== SECURE PREVIEW COMPONENTS ==========
const SecureImagePreview = ({ url }) => {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isLoading) {
        console.warn("Image load timeout:", url);
        setImageError(true);
        setIsLoading(false);
      }
    }, 10000);

    return () => clearTimeout(timer);
  }, [isLoading]);

  if (imageError) {
    return (
      <Alert
        message="Failed to load image"
        description={
          <>
            <p>The image could not be displayed.</p>
            <Button 
              type="primary"
              onClick={() => window.open(url, "_blank", "noopener,noreferrer")}
            >
              Open in New Tab
            </Button>
          </>
        }
        type="warning"
        showIcon
      />
    );
  }

  return (
    <div style={{ textAlign: 'center' }}>
      {isLoading && (
        <div style={{ textAlign: "center", padding: 40 }}>
          <Spin tip="Loading image..." />
        </div>
      )}

      <img
        src={url}
        alt="Preview"
        onError={() => {
          console.error("Image failed:", url);
          setImageError(true);
          setIsLoading(false);
        }}
        onLoad={() => {
          console.log("Image loaded:", url);
          setIsLoading(false);
        }}
        style={{
          display: isLoading ? "none" : "block",
          maxWidth: "100%",
          height: "auto",
        }}
      />
    </div>
  );
};

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
      <Alert
        message="Using Google Docs Viewer for reliable preview."
        type="info"
        showIcon
        style={{ marginBottom: 8, padding: '4px 12px' }}
      />

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

// ========== MAIN COMPONENT ==========
const CustomerCollapseContent = ({ customer, areaIdToNameMap, documents = [] }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileType, setFileType] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState(null);
  const [verificationWarning, setVerificationWarning] = useState(null);

  if (!customer) return null;

  const areaName = areaIdToNameMap?.[customer.area] || `Area ${customer.area}` || "N/A";

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const truncateText = (text, maxLength = 13) =>
    !text
      ? "No description"
      : text.length > maxLength
        ? `${text.slice(0, maxLength)}...`
        : text;

  const getFileIcon = (url) => {
    const type = getFileTypeFromUrl(url);
    switch (type) {
      case "pdf": return pdfIcon;
      case "image": return imageIcon;
      case "word": return wordIcon;
      case "excel": return excelIcon;
      default: return defaultIcon;
    }
  };

  // Helper to get document label based on type
  const getDocumentLabel = (doc) => {
    const typeLabels = {
      'aadhaar': 'Aadhaar Card:',
      'pan': 'PAN Card:',
      'voter_id': 'Voter ID:',
      'driving_license': 'Driving License:',
      'passport': 'Passport:',
      'bank_statement': 'Bank Statement:',
      'address_proof': 'Address Proof:',
      'photo': 'Photo:',
      'other': 'Document:'
    };
    return typeLabels[doc.document_type?.toLowerCase()] || `Document:`;
  };

  const handleOpenFile = async (url) => {
    console.log('Opening file:', url);
    setIsVerifying(true);
    setVerificationError(null);
    setVerificationWarning(null);

    try {
      const urlCheck = isUrlSafe(url);
      if (!urlCheck.safe) {
        setVerificationError(urlCheck.reason);
        setIsVerifying(false);
        return;
      }

      const extensionType = getFileTypeFromUrl(url);
      if (extensionType === "blocked") {
        setVerificationError('This file type is blocked for security reasons');
        setIsVerifying(false);
        return;
      }

      const contentCheck = await verifyContentType(url);
      if (!contentCheck.safe) {
        setVerificationError(contentCheck.reason);
        setIsVerifying(false);
        return;
      }

      setSelectedFile(url);
      setFileType(contentCheck.type || extensionType);
      setIsModalOpen(true);
      
    } catch (error) {
      console.error('Error opening file:', error);
      setVerificationError('An error occurred while opening the file');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    setSelectedFile(null);
    setFileType("");
    setVerificationError(null);
    setVerificationWarning(null);
  };

  const renderPreview = () => {
    if (!selectedFile) return <p>No file selected</p>;

    switch (fileType) {
      case "pdf":
        return <SecurePDFPreview url={selectedFile} />;
      
      case "image":
        return <SecureImagePreview url={selectedFile} />;
      
      case "excel":
      case "word":
        return (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Alert
              message={`${fileType === "excel" ? "Excel" : "Word"} File`}
              description="Preview not supported for this file type."
              type="info"
              showIcon
            />
            <Button 
              type="primary" 
              size="large"
              style={{ marginTop: 16 }}
              onClick={() => window.open(selectedFile, '_blank', 'noopener,noreferrer')}
            >
              Open {fileType === "excel" ? "Excel" : "Word"} File
            </Button>
          </div>
        );

      case "video":
        return (
          <div style={{ textAlign: 'center' }}>
            <video 
              controls 
              style={{ maxWidth: '100%', maxHeight: '500px' }}
              controlsList="nodownload"
            >
              <source src={selectedFile} />
              Your browser does not support video playback.
            </video>
          </div>
        );

      default:
        return (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Alert
              message="Preview not available"
              description="This file type cannot be previewed."
              type="warning"
              showIcon
            />
            <Button 
              type="primary" 
              size="large"
              style={{ marginTop: 16 }}
              onClick={() => window.open(selectedFile, '_blank', 'noopener,noreferrer')}
            >
              Open in New Tab
            </Button>
          </div>
        );
    }
  };

  return (
    <>
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
          {/* Basic Information */}
          <Descriptions.Item label="Customer ID:">
            {/* <Tag color="blue">{customer.customer_id || "N/A"}</Tag> */}
            {customer.customer_id || "N/A"}
          </Descriptions.Item>
          <Descriptions.Item label="Customer Code:">
            {customer.customer_code || "N/A"}
          </Descriptions.Item>
          <Descriptions.Item label="Customer Order:">
            {customer.customer_order || "N/A"}
          </Descriptions.Item>
          
          <Descriptions.Item label="Name:">
            {customer.customer_name || "N/A"}
          </Descriptions.Item>
          <Descriptions.Item label="Profession:">
            {customer.profession || "N/A"}
          </Descriptions.Item>
          <Descriptions.Item label="Email:">
            {customer.email_id || "N/A"}
          </Descriptions.Item>

          {/* Contact Information */}
          <Descriptions.Item label="Mobile:">
            {/* <Tag color="green">{customer.mobile_number || "N/A"}</Tag> */}
            {customer.mobile_number || "N/A"}
          </Descriptions.Item>
          <Descriptions.Item label="Alternate Mobile:">
            {customer.alternate_mobile_number || "N/A"}
          </Descriptions.Item>
          <Descriptions.Item label="Aadhaar ID:">
            {customer.aadhaar_id || "N/A"}
          </Descriptions.Item>

          {/* Document Information */}
          <Descriptions.Item label="PAN Number:">
            {customer.pan_number || "N/A"}
          </Descriptions.Item>
          <Descriptions.Item label="Guarantor:">
            {customer.guarantor || "N/A"}
          </Descriptions.Item>
          <Descriptions.Item label="Branch ID:">
            {customer.branch || "N/A"}
          </Descriptions.Item>

          {/* Location Information */}
          <Descriptions.Item label="Line ID:">
            {customer.line || "N/A"}
          </Descriptions.Item>
          <Descriptions.Item label="Area:">
            {/* <Tag color="purple">{areaName}</Tag> */}
            {areaName}
          </Descriptions.Item>
          <Descriptions.Item label="Coordinates:">
            {customer.latitude && customer.longitude
              ? `${parseFloat(customer.latitude).toFixed(6)}, ${parseFloat(customer.longitude).toFixed(6)}`
              : "N/A"}
          </Descriptions.Item>

          {/* Address - Full Width */}
          {customer.address && (
            <Descriptions.Item label="Address:" span={{ xs: 1, sm: 2, md: 3 }}>
              {customer.address}
            </Descriptions.Item>
          )}

          {/* Document Attachments */}
          {documents && documents.length > 0 && documents.map((doc, index) => {
            // Handle different URL field names
            const fileUrl = doc.file_url || doc.signed_url || doc.url;
            const description = doc.document_description || doc.description || doc.name || 'Document';
            const label = doc.label || getDocumentLabel(doc);
            
            if (!fileUrl) return null;
            
            const iconUrl = getFileIcon(fileUrl);
            
            return (
              <Descriptions.Item
                key={`doc-${doc.id || index}`}
                label={label}
                span={1}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <img src={iconUrl} alt="File Icon" width={20} height={20} />
                  <span
                    onClick={() => handleOpenFile(fileUrl)}
                    style={{
                      color: '#1890ff',
                      cursor: 'pointer',
                      textDecoration: 'underline'
                    }}
                    title={description}
                    role="button"
                    tabIndex={0}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleOpenFile(fileUrl);
                      }
                    }}
                  >
                  <Tag color="green">  {truncateText(description)}</Tag>
                  </span>
                </div>
              </Descriptions.Item>
            );
          })}

          {/* Remarks - Full Width */}
          {customer.other_remarks && (
            <Descriptions.Item label="Remarks:" span={{ xs: 1, sm: 2, md: 3 }}>
              {customer.other_remarks}
            </Descriptions.Item>
          )}

          {/* Audit Information */}
          {/* <Descriptions.Item label="Created By:">
            User ID: {customer.created_by || "N/A"}
          </Descriptions.Item>
          <Descriptions.Item label="Created Time:">
            {formatDate(customer.created_time)}
          </Descriptions.Item>
          <Descriptions.Item label="Last Modified By:">
            User ID: {customer.last_modified_by || "N/A"}
          </Descriptions.Item>
          <Descriptions.Item label="Modified Time:" span={{ xs: 1, sm: 2, md: 3 }}>
            {formatDate(customer.modified_time)}
          </Descriptions.Item> */}
        </Descriptions>

        {verificationError && (
          <Alert
            message="Security Warning"
            description={verificationError}
            type="error"
            showIcon
            closable
            onClose={() => setVerificationError(null)}
            style={{ marginTop: 16 }}
          />
        )}
      </div>

      <Modal
  title="Document Preview"
  open={isModalOpen}
  onCancel={handleCancel}
  footer={[
    <Button key="cancel" onClick={handleCancel}>
      Close
    </Button>,
  ]}
  width={900}
  centered
  destroyOnClose
  bodyStyle={{ padding: '16px', margin: 0 }} // Add this line
  style={{ top: 20 }} // Add this line
>
  {isVerifying ? (
    <div style={{ textAlign: 'center', padding: 40 }}>
      <Spin tip="Verifying file security..." />
    </div>
  ) : (
    <>
      {verificationWarning && (
        <Alert
          message={verificationWarning}
          type="warning"
          showIcon
          closable
          style={{ marginBottom: 12, padding: '4px 12px' }}
        />
      )}
      {renderPreview()}
    </>     
  )}
</Modal>
    </>
  );
};

export default CustomerCollapseContent;