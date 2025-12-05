import { useEffect, useState, useCallback } from "react";
import { Form, Input, Button, Select, notification, Divider, Space, InputNumber, Tabs, Modal } from "antd";
import { UserOutlined, PhoneOutlined, MailOutlined, IdcardOutlined, EnvironmentOutlined, FileTextOutlined, UserAddOutlined, ReloadOutlined, PlusOutlined, MinusOutlined, HomeOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from "react-router-dom";
import Loader from "components/Common/Loader";
import { GET, POST, PUT, DELETE } from "helpers/api_helper";
import { AREA } from "helpers/url_helper";
import "./AddCustomer.css";
import AddCustomerDocument from "./AddCustomerDocument";
import professionIcon from '../../../assets/icons/businessman.png'
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';

const mapContainerStyle = {
    width: '100%',
    height: '400px'
};
const { Option } = Select;
const { TextArea } = Input;

const AddCustomer = () => {
    const [loader, setLoader] = useState(false);
    const [activeTab, setActiveTab] = useState("1");
    const [lineList, setLineList] = useState([]);
    const [areaList, setAreaList] = useState([]);
    const [branchList, setBranchList] = useState([]);
    const [allData, setAllData] = useState([]);
    const [filteredLineList, setFilteredLineList] = useState([]);
    const [filteredAreaList, setFilteredAreaList] = useState([]);
    const [isPersonalInfoSubmitted, setIsPersonalInfoSubmitted] = useState(false);
    const [nextCustomerId, setNextCustomerId] = useState(null);
    const [currentCustomerId, setCurrentCustomerId] = useState(null);
    const [mapModalVisible, setMapModalVisible] = useState(false);
    const [mapCenter, setMapCenter] = useState({ lat: 20.5937, lng: 78.9629 });
    const [selectedLocation, setSelectedLocation] = useState(null);
    
    // LocalStorage states
    const [savedBranchName, setSavedBranchName] = useState(null);
    const [savedLineName, setSavedLineName] = useState(null);
    const [savedAreaId, setSavedAreaId] = useState(null);
    const [savedAreaName, setSavedAreaName] = useState(null);
    const [isFromLocalStorage, setIsFromLocalStorage] = useState(false);

    const [form] = Form.useForm();
    const params = useParams();
    const navigate = useNavigate();

    const getAreaList = useCallback(async () => {
        try {
            setLoader(true);
            const response = await GET(AREA);
            if (response?.status === 200) {
                const data = response.data;
                setAllData(data);
                
                // Extract unique branches
                const branchMap = new Map();
                data.forEach(item => {
                    if (item.branch_id && !branchMap.has(item.branch_id)) {
                        branchMap.set(item.branch_id, {
                            id: item.branch_id,
                            branch_name: item.branch_name
                        });
                    }
                });
                const uniqueBranches = Array.from(branchMap.values());
                
                // Extract unique lines
                const lineMap = new Map();
                data.forEach(item => {
                    if (item.line_id && !lineMap.has(item.line_id)) {
                        lineMap.set(item.line_id, {
                            id: item.line_id,
                            name: item.line_name,
                            branch_id: item.branch_id
                        });
                    }
                });
                const uniqueLines = Array.from(lineMap.values());
                
                // Extract unique areas
                const areaMap = new Map();
                data.forEach(item => {
                    if (item.id && !areaMap.has(item.id)) {
                        areaMap.set(item.id, {
                            id: item.id,
                            name: item.areaName,
                            branch_id: item.branch_id,
                            line_id: item.line_id
                        });
                    }
                });
                const uniqueAreas = Array.from(areaMap.values());
                
                setBranchList(uniqueBranches);
                setLineList(uniqueLines);
                setAreaList(uniqueAreas);
                setFilteredLineList(uniqueLines);
                setFilteredAreaList(uniqueAreas);

                // Check for saved selections in localStorage
                const storedLineName = localStorage.getItem('selected_line_name');
                const storedAreaId = localStorage.getItem('selected_area_id');
                const storedAreaName = localStorage.getItem('selected_area_name');
                const storedBranchName = localStorage.getItem('selected_branch_name');

                if (storedLineName && storedAreaId && storedBranchName && !params.id) {
                    // Set saved values
                    setSavedBranchName(storedBranchName);
                    setSavedLineName(storedLineName);
                    setSavedAreaId(parseInt(storedAreaId));
                    setSavedAreaName(storedAreaName);
                    setIsFromLocalStorage(true);

                    // Find the branch ID from branch name
                    const matchedBranch = uniqueBranches.find(
                        branch => branch.branch_name === storedBranchName
                    );

                    // Find the line ID from line name
                    const matchedLine = uniqueLines.find(
                        line => line.name === storedLineName && 
                               line.branch_id === matchedBranch?.id
                    );

                    if (matchedBranch && matchedLine) {
                        // Set form values
                        form.setFieldsValue({
                            branch: matchedBranch.id,
                            line: matchedLine.id,
                            area: parseInt(storedAreaId)
                        });

                        // Filter line and area lists
                        const filteredLines = uniqueLines.filter(
                            line => line.branch_id === matchedBranch.id
                        );
                        setFilteredLineList(filteredLines);

                        const filteredAreas = uniqueAreas.filter(
                            area => area.branch_id === matchedBranch.id && 
                                   area.line_id === matchedLine.id
                        );
                        setFilteredAreaList(filteredAreas);
                    }
                }
            }
            setLoader(false);
        } catch (error) {
            setLoader(false);
            notification.error({
                message: 'Error',
                description: 'Failed to fetch area details',
                duration: 3,
            });
            console.error(error);
        }
    }, [params.id, form]);

    const getAllCustomers = useCallback(async () => {
        try {
            const response = await GET('/api/customers/');
            if (response?.status === 200) {
                const customers = response.data;
                
                if (customers && customers.length > 0) {
                    const maxId = Math.max(...customers.map(customer => customer.customer_order));
                    setNextCustomerId(maxId + 1);
                } else {
                    setNextCustomerId(1);
                }
            }
        } catch (error) {
            console.error('Error fetching customers:', error);
            setNextCustomerId(1);
        }
    }, []);

    const handleBranchChange = (branchId) => {
        const filtered = allData.filter(item => item.branch_id === branchId);
        
        const lineMap = new Map();
        filtered.forEach(item => {
            if (item.line_id && !lineMap.has(item.line_id)) {
                lineMap.set(item.line_id, {
                    id: item.line_id,
                    name: item.line_name,
                    branch_id: item.branch_id
                });
            }
        });
        const filteredLines = Array.from(lineMap.values());
        setFilteredLineList(filteredLines);
        
        form.setFieldsValue({ line: undefined, area: undefined });
        setFilteredAreaList([]);
    };

    const handleLineChange = (lineId) => {
        const branchId = form.getFieldValue('branch');
        
        const filtered = allData.filter(item => 
            item.branch_id === branchId && item.line_id === lineId
        );
        
        const areaMap = new Map();
        filtered.forEach(item => {
            if (item.id && !areaMap.has(item.id)) {
                areaMap.set(item.id, {
                    id: item.id,
                    name: item.areaName,
                    branch_id: item.branch_id,
                    line_id: item.line_id
                });
            }
        });
        const filteredAreas = Array.from(areaMap.values());
        setFilteredAreaList(filteredAreas);
        
        form.setFieldsValue({ area: undefined });
    };

   // Replace the getCustomerDetails function with this updated version:

const getCustomerDetails = useCallback(async () => {
    try {
        setLoader(true);
        const response = await GET(`/api/customers/${params.id}/`);
        if (response?.status === 200) {
            const data = response?.data;
            
            // Find names for branch, line, and area from IDs
            const customerBranch = branchList.find(b => b.id === data.branch);
            const customerLine = lineList.find(l => l.id === data.line);
            const customerArea = areaList.find(a => a.id === data.area);
            
            // Store the names for display
            if (customerBranch) setSavedBranchName(customerBranch.branch_name);
            if (customerLine) setSavedLineName(customerLine.name);
            if (customerArea) setSavedAreaName(customerArea.name);
            
            // FIX: Ensure reference_contacts always has at least one field
            if (!data.reference_contacts || data.reference_contacts.length === 0) {
                data.reference_contacts = [{ reference_number: '' }];
            }
            
            form.setFieldsValue(data);
            setIsPersonalInfoSubmitted(true);
            setCurrentCustomerId(data?.id);
            
            if (data?.latitude && data?.longitude) {
                setSelectedLocation({
                    lat: data.latitude,
                    lng: data.longitude,
                    address: `${data.latitude}, ${data.longitude}`
                });
            }
        }
        setLoader(false);
    } catch (error) {
        setLoader(false);
        notification.error({
            message: 'Error',
            description: 'Failed to fetch customer details',
            duration: 3,
        });
        console.error(error);
    }
}, [params.id, form, branchList, lineList, areaList]);


// ALTERNATIVE SOLUTION: Update the useEffect that initializes the form
// Replace the existing useEffect with this:

useEffect(() => {
    getAreaList();
    
    // Always initialize reference_contacts with at least one field
    if (!params.id) {
        getAllCustomers();
    }
    
    // Initialize form with one reference contact field (for both add and edit)
    form.setFieldsValue({
        reference_contacts: [{ reference_number: '' }]
    });
}, [params.id, getAllCustomers, getAreaList, form]);

    useEffect(() => {
        getAreaList();
        
        if (!params.id) {
            getAllCustomers();
            form.setFieldsValue({
                reference_contacts: [{ reference_number: '' }]
            });
        }
    }, [params.id, getAllCustomers, getAreaList, form]);

    // Separate useEffect for getting customer details after area list is loaded
    useEffect(() => {
        if (params.id && branchList.length > 0 && lineList.length > 0 && areaList.length > 0) {
            getCustomerDetails();
        }
    }, [params.id, branchList, lineList, areaList, getCustomerDetails]);

    const openMapModal = () => {
        if (selectedLocation) {
            setMapCenter({ lat: selectedLocation.lat, lng: selectedLocation.lng });
        }
        setMapModalVisible(true);
    };

    const handleMapClick = (e) => {
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();
        setSelectedLocation({
            lat: lat.toFixed(6),
            lng: lng.toFixed(6),
            address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`
        });
        setMapCenter({ lat, lng });
    };

    const handleGetCurrentLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    setSelectedLocation({
                        lat: lat.toFixed(6),
                        lng: lng.toFixed(6),
                        address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`
                    });
                    setMapCenter({ lat, lng });
                },
                (error) => {
                    notification.error({
                        message: 'Error',
                        description: 'Unable to get current location',
                        duration: 3,
                    });
                    console.error(error);
                }
            );
        } else {
            notification.error({
                message: 'Error',
                description: 'Geolocation is not supported by your browser',
                duration: 3,
            });
        }
    };

    const handleMapModalOk = () => {
        if (selectedLocation) {
            form.setFieldsValue({
                latitude: parseFloat(selectedLocation.lat),
                longitude: parseFloat(selectedLocation.lng)
            });
            setMapModalVisible(false);
        } else {
            notification.error({
                message: 'Error',
                description: 'Please select a location on the map',
                duration: 3,
            });
        }
    };

 // Replace the onFinish function with this updated version:

const onFinish = async (values) => {
    setLoader(true);
    try {
        // Filter out empty reference contacts
        const filteredReferenceContacts = (values.reference_contacts || []).filter(
            contact => contact.reference_number && contact.reference_number.trim() !== ''
        );

        const payload = {
            customer_name: values.customer_name,
            mobile_number: values.mobile_number,
            alternate_mobile_number: values.alternate_mobile_number || null,
            email_id: values.email_id,
            aadhaar_id: values.aadhaar_id,
            pan_number: values.pan_number,
            address: values.address,
            profession: values.profession,
            line: values.line,
            area: values.area,
            branch: values.branch,
            latitude: values.latitude ? String(values.latitude) : null,
            longitude: values.longitude ? String(values.longitude) : null,
            customer_order: params.id ? values.customer_order : nextCustomerId,
            reference_contacts: filteredReferenceContacts,
        };

        console.log('Payload being sent:', payload);

        let response;
        if (params.id) {
            response = await PUT(`/api/customers/${params.id}/`, payload);
        } else {
            response = await POST('/api/customers/', payload);
        }

        setLoader(false);

        if (response.status === 400) {
            // Handle validation errors
            const errorMessages = [];
            
            if (response?.data) {
                Object.keys(response.data).forEach(key => {
                    if (Array.isArray(response.data[key])) {
                        errorMessages.push(`${key}: ${response.data[key][0]}`);
                    } else {
                        errorMessages.push(`${key}: ${response.data[key]}`);
                    }
                });
            }

            notification.error({
                message: 'Validation Error',
                description: errorMessages.length > 0 
                    ? errorMessages.join('\n')
                    : (params.id ? 'Failed to update customer' : 'Failed to create customer'),
                duration: 5,
            });
            return;
        }

        notification.success({
            message: `${values.customer_name} ${params.id ? 'Updated' : 'Added'}!`,
            description: params.id 
                ? 'Customer details updated successfully. You can now manage documents.' 
                : 'Customer added successfully. You can now upload documents.',
            duration: 3,
        });

        // FIX: In both add and edit mode, go to document upload tab
        if (!params.id) {
            // Add mode
            form.setFieldsValue({ id: response?.data?.id });
            setCurrentCustomerId(response?.data?.id);
            setIsPersonalInfoSubmitted(true);
            setActiveTab("2");
        } else {
            // Edit mode - also go to tab 2 instead of navigating away
            setCurrentCustomerId(params.id);
            setIsPersonalInfoSubmitted(true);
            setActiveTab("2");
        }
    } catch (error) {
        console.error('Submit error:', error);
        notification.error({
            message: 'Error',
            description: error?.response?.data?.detail || 'An error occurred. Please try again.',
            duration: 5,
        });
        setLoader(false);
    }
};
    
    const handleReset = () => {
        form.resetFields();
        
        // If values are from localStorage, restore them
        if (isFromLocalStorage && savedBranchName && savedLineName && savedAreaId) {
            const matchedBranch = branchList.find(
                branch => branch.branch_name === savedBranchName
            );
            const matchedLine = lineList.find(
                line => line.name === savedLineName
            );

            if (matchedBranch && matchedLine) {
                form.setFieldsValue({
                    branch: matchedBranch.id,
                    line: matchedLine.id,
                    area: savedAreaId
                });
            }
        } else {
            setFilteredLineList(lineList);
            setFilteredAreaList(areaList);
        }
    };

    const handleDelete = async () => {
        if (!params.id) return;

        try {
            setLoader(true);
            const response = await DELETE(`/api/customers/${params.id}/`);
            
            if (response.status === 204 || response.status === 200) {
                notification.success({
                    message: 'Customer Deleted',
                    description: 'Customer has been deleted successfully',
                    duration: 0,
                });
                navigate('/customers');
            } else {
                notification.error({
                    message: 'Error',
                    description: 'Failed to delete customer',
                    duration: 0,
                });
            }
            setLoader(false);
        } catch (error) {
            notification.error({
                message: 'Error',
                description: 'Failed to delete customer',
                duration: 0,
            });
            setLoader(false);
            console.error(error);
        }
    };

    const handleTabChange = (key) => {
        if (key === "2") {
        // In add mode: only allow if personal info is submitted
        if (!params.id && !isPersonalInfoSubmitted) {
            notification.warning({
                message: 'Complete Personal Information',
                description: 'Please submit the personal information form before uploading documents.',
                duration: 3,
            });
            return;
        }
    }
        setActiveTab(key);
    };

    const handlePreviousTab = () => {
        setActiveTab("1");
    };

    const handleCancelForm = () => {
        if (window.confirm('Are you sure you want to cancel? All unsaved changes will be lost.')) {
            navigate('/view-customer');
        }
    };

    const tabItems = [
        {
            key: "1",
            label: (
                <span>
                    <UserAddOutlined />
                    Personal Info
                </span>
            ),
            children: (
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={onFinish}
                    className="add-customer-form"
                >
                    <div className="container add-customer-form-container">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>
                                Personal Information
                            </h3>
                            <Button
                                icon={<ReloadOutlined />}
                                onClick={handleReset}
                                title="Reset to Original"
                            />
                        </div>

                        <div className="row mb-2">
                            <div className="col-md-6">
                                <Form.Item
                                    label="Customer Name"
                                    name="customer_name"
                                    rules={[
                                        { required: true, message: 'Please enter customer name' },
                                        { min: 2, message: 'Name must be at least 2 characters' }
                                    ]}
                                >
                                    <Input 
                                        prefix={<UserOutlined />}
                                        placeholder="Enter customer name" 
                                        size="large" 
                                    />
                                </Form.Item>
                            </div>

                            <div className="col-md-6">
                                <Form.Item
                                    label="Mobile Number"
                                    name="mobile_number"
                                    rules={[
                                        { required: true, message: 'Please enter mobile number' },
                                        { pattern: /^\d{10}$/, message: 'Mobile number must be 10 digits' }
                                    ]}
                                >
                                    <Input 
                                        prefix={<PhoneOutlined />}
                                        placeholder="10 digit mobile number" 
                                        size="large"
                                        maxLength={10}
                                    />
                                </Form.Item>
                            </div>
                        </div>

                        <div className="row mb-2">
                            <div className="col-md-6">
                                <Form.Item
                                    label="Alternate Mobile Number"
                                    name="alternate_mobile_number"
                                    rules={[
                                        { pattern: /^\d{10}$/, message: 'Alternate mobile number must be 10 digits' }
                                    ]}
                                >
                                    <Input 
                                        prefix={<PhoneOutlined />}
                                        placeholder="10 digit alternate mobile number (optional)" 
                                        size="large"
                                        maxLength={10}
                                    />
                                </Form.Item>
                            </div>

                            <div className="col-md-6">
                                <Form.Item
                                    label="Email ID"
                                    name="email_id"
                                    rules={[
                                        { required: true, message: 'Please enter email' },
                                        { type: 'email', message: 'Please enter valid email' }
                                    ]}
                                >
                                    <Input 
                                        prefix={<MailOutlined />}
                                        placeholder="example@email.com" 
                                        size="large"
                                    />
                                </Form.Item>
                            </div>
                        </div>

                        <div className="row mb-2">
                            <div className="col-md-6">
                                <Form.Item
                                    label="Profession"
                                    name="profession"
                                    rules={[
                                        { required: true, message: 'Please enter profession' }
                                    ]}
                                >
                                    <Input 
                                        prefix={
                                            <img 
                                                src={professionIcon} 
                                                alt="Profession Icon" 
                                                style={{ width: '16px', height: '16px', marginRight: '8px' }}
                                            />
                                        }
                                        placeholder="Enter profession" 
                                        size="large"
                                    />
                                </Form.Item>
                            </div>

                            <div className="col-md-6">
                                <Form.Item
                                    label="Aadhaar ID"
                                    name="aadhaar_id"
                                    rules={[
                                        { required: true, message: 'Please enter Aadhaar ID' },
                                        { pattern: /^\d{12}$/, message: 'Aadhaar ID must be 12 digits' }
                                    ]}
                                >
                                    <Input 
                                        prefix={<IdcardOutlined />}
                                        placeholder="12 digit Aadhaar number" 
                                        size="large"
                                        maxLength={12}
                                    />
                                </Form.Item>
                            </div>
                        </div>

                        <div className="row mb-2">
                            <div className="col-md-6">
                                <Form.Item
                                    label="PAN Number"
                                    name="pan_number"
                                    rules={[
                                        { required: true, message: 'Please enter PAN number' },
                                    ]}
                                >
                                    <Input 
                                        prefix={<IdcardOutlined />}
                                        placeholder="ABCDE1234F" 
                                        size="large"
                                        maxLength={10}
                                        style={{ textTransform: 'uppercase' }}
                                    />
                                </Form.Item>
                            </div>

                            <div className="col-md-6">
                                <Form.Item
                                    label="Address"
                                    name="address"
                                    rules={[
                                        { required: true, message: 'Please enter address' },
                                    ]}
                                >
                                    <Input.TextArea 
                                     prefix={<IdcardOutlined />}
                                        placeholder="Enter complete address" 
                                        rows={2}
                                        size="large"
                                        allowClear
                                    />
                                </Form.Item>
                            </div>
                        </div>

                        <Divider className="add-customer-divider" style={{border: "1px solid #d9d9d9"}}/>
                                        <Divider orientation="center">Location Details</Divider>
                        {/* <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
                            Location Details
                        </h3> */}

                        {/* Display info banner when fields are from localStorage */}
                        {/* {isFromLocalStorage && !params.id && (
                            <div style={{ 
                                marginBottom: '16px', 
                                padding: '12px', 
                                background: '#e6f7ff', 
                                border: '1px solid #91d5ff',
                                borderRadius: '4px'
                            }}>
                                <strong>Note:</strong> Branch, Line, and Area are pre-selected from your last selection and cannot be changed.
                            </div>
                        )} */}

                        {params.id && (
                            <div style={{ 
                                marginBottom: '16px', 
                                padding: '12px', 
                                background: '#fff7e6', 
                                border: '1px solid #ffd591',
                                borderRadius: '4px'
                            }}>
                                <strong>Note:</strong> Branch, Line, and Area cannot be changed while editing a customer.
                            </div>
                        )}

                        <div className="row mb-2">
                            <div className="col-md-4">
                                {(isFromLocalStorage && !params.id) || params.id ? (
                                    <>
                                        <Form.Item
                                            label="Branch"
                                            name="branch"
                                            rules={[
                                                { required: true, message: 'Please select branch' }
                                            ]}
                                            style={{ display: 'none' }}
                                        >
                                            <Input type="hidden" />
                                        </Form.Item>
                                        <Form.Item label="Branch">
                                            <Input
                                                value={savedBranchName}
                                                size="large"
                                                disabled
                                                style={{ 
                                                    backgroundColor: '#f5f5f5',
                                                    color: '#000',
                                                    cursor: 'not-allowed'
                                                }}
                                            />
                                        </Form.Item>
                                    </>
                                ) : (
                                    <Form.Item
                                        label="Branch"
                                        name="branch"
                                        rules={[
                                            { required: true, message: 'Please select branch' }
                                        ]}
                                    >
                                        <Select
                                            placeholder="Select Branch"
                                            size="large"
                                            showSearch
                                            allowClear
                                            onChange={handleBranchChange}
                                            filterOption={(input, option) =>
                                                option.children.toLowerCase().includes(input.toLowerCase())
                                            }
                                        >
                                            {branchList.map((branch) => (
                                                <Option key={branch.id} value={branch.id}>
                                                    {branch.branch_name}
                                                </Option>
                                            ))}
                                        </Select>
                                    </Form.Item>
                                )}
                            </div>

                            <div className="col-md-4">
                                {(isFromLocalStorage && !params.id) || params.id ? (
                                    <>
                                        <Form.Item
                                            label="Line"
                                            name="line"
                                            rules={[
                                                { required: true, message: 'Please select line' }
                                            ]}
                                            style={{ display: 'none' }}
                                        >
                                            <Input type="hidden" />
                                        </Form.Item>
                                        <Form.Item label="Line">
                                            <Input
                                                value={savedLineName}
                                                size="large"
                                                disabled
                                                style={{ 
                                                    backgroundColor: '#f5f5f5',
                                                    color: '#000',
                                                    cursor: 'not-allowed'
                                                }}
                                            />
                                        </Form.Item>
                                    </>
                                ) : (
                                    <Form.Item
                                        label="Line"
                                        name="line"
                                        rules={[
                                            { required: true, message: 'Please select line' }
                                        ]}
                                    >
                                        <Select
                                            placeholder="Select Line"
                                            size="large"
                                            showSearch
                                            allowClear
                                            onChange={handleLineChange}
                                            filterOption={(input, option) =>
                                                option.children.toLowerCase().includes(input.toLowerCase())
                                            }
                                        >
                                            {filteredLineList.map((line) => (
                                                <Option key={line.id} value={line.id}>
                                                    {line.name}
                                                </Option>
                                            ))}
                                        </Select>
                                    </Form.Item>
                                )}
                            </div>

                            <div className="col-md-4">
                                {(isFromLocalStorage && !params.id) || params.id ? (
                                    <>
                                        <Form.Item
                                            label="Area"
                                            name="area"
                                            rules={[
                                                { required: true, message: 'Please select area' }
                                            ]}
                                            style={{ display: 'none' }}
                                        >
                                            <Input type="hidden" />
                                        </Form.Item>
                                        <Form.Item label="Area">
                                            <Input
                                                value={savedAreaName}
                                                size="large"
                                                disabled
                                                style={{ 
                                                    backgroundColor: '#f5f5f5',
                                                    color: '#000',
                                                    cursor: 'not-allowed'
                                                }}
                                            />
                                        </Form.Item>
                                    </>
                                ) : (
                                    <Form.Item
                                        label="Area"
                                        name="area"
                                        rules={[
                                            { required: true, message: 'Please select area' }
                                        ]}
                                    >
                                        <Select
                                            placeholder="Select Area"
                                            size="large"
                                            showSearch
                                            allowClear
                                            filterOption={(input, option) =>
                                                option.children.toLowerCase().includes(input.toLowerCase())
                                            }
                                        >
                                            {filteredAreaList.map((area) => (
                                                <Option key={area.id} value={area.id}>
                                                    {area.name}
                                                </Option>
                                            ))}
                                        </Select>
                                    </Form.Item>
                                )}
                            </div>
                        </div>

                        <div className="row mb-2">
                            <div className="col-md-12">
                                <Form.Item
                                    label="Location"
                                    rules={[
                                        { required: true, message: 'Please select location' }
                                    ]}
                                >
                                    <Input 
                                        prefix={<EnvironmentOutlined />}
                                        placeholder="Click map icon to select location" 
                                        size="large"
                                        disabled
                                        value={selectedLocation ? selectedLocation.address : ''}
                                        suffix={
                                            <Button
                                                type="text"
                                                icon={<EnvironmentOutlined />}
                                                onClick={openMapModal}
                                                style={{ color: '#1890ff' }}
                                            />
                                        }
                                    />
                                </Form.Item>
                            </div>
                        </div>

                        <Form.Item name="latitude" style={{ display: 'none' }}>
                            <Input type="hidden" />
                        </Form.Item>
                        <Form.Item name="longitude" style={{ display: 'none' }}>
                            <Input type="hidden" />
                        </Form.Item>
                        <Form.Item name="customer_order" style={{ display: 'none' }}>
    <Input type="hidden" />
</Form.Item>

                        <Divider style={{ borderTop: "2px solid #d9d9d9" }} />
<Divider orientation="center">Reference Contacts</Divider>
                       
                        <Form.List name="reference_contacts">
                            {(fields, { add, remove }) => (
                                <>
                                    {fields.map(({ key, name, ...restField }, index) => (
                                        <div key={key} className="row mb-3">
                                            <div className="col-md-6" style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
                                                <Form.Item
                                                    {...restField}
                                                    name={[name, 'reference_number']}
                                                    label={`Reference Contact ${index + 1}`}
                                                    rules={[
                                                        { pattern: /^\d{10}$/, message: 'Mobile number must be 10 digits' }
                                                    ]}
                                                    style={{ flexGrow: 1, marginBottom: 0 }} 
                                                >
                                                    <Input
                                                        prefix={<PhoneOutlined />}
                                                        placeholder="10 digit mobile number"
                                                        size="large"
                                                        maxLength={10}
                                                    />
                                                </Form.Item>

                                                {fields.length > 1 && (
                                                    <Button
                                                        type="primary"
                                                        danger
                                                        shape="circle"
                                                        icon={<MinusOutlined />}
                                                        onClick={() => remove(name)}
                                                        style={{
                                                            width: 35, 
                                                            height: 35, 
                                                            backgroundColor: 'red',
                                                            borderColor: 'red',
                                                        }}
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    ))}

                                    {/* Add Button - Only show if less than 5 reference contacts */}
                                    {fields.length < 5 && (
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
                                            <Button
                                                type="primary"
                                                shape="circle"
                                                icon={<PlusOutlined />}
                                                onClick={() => add()}
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
                            )}
                        </Form.List>

                        <Divider style={{ borderTop: "2px solid #d9d9d9" }} />

                        <div className="text-center mt-4">
                            <Space size="middle">
                                <Button
                                    size="large"
                                    onClick={() => navigate("/view-customer")}
                                >
                                    Cancel
                                </Button>
                                 
                                <Button type="primary" htmlType="submit" size="large">
                                    {params.id ? "Update Customer" : "Submit & Next"}
                                </Button>
                                
                               
                            </Space>
                             {/* {params.id && (
                                    <Button 
                                        danger
                                        size="large"
                                        onClick={handleDelete}
                                        style={{marginTop: '10px'}}
                                    >
                                        Delete 
                                    </Button>
                                )} */}
                        </div>
                    </div>
                </Form>
            )
        },
        {
            key: "2",
            label: (
                <span>
                    <FileTextOutlined />
                     Upload Doc
                </span>
            ),
            children: <AddCustomerDocument 
                    customerId={currentCustomerId || params.id} 
                    onPrevious={handlePreviousTab}
                    onCancel={handleCancelForm}
                />,
        }
    ];

    return (
        <>
            {loader && <Loader />}

            <div className="add-customer-page-content">
                <div className="add-customer-container-fluid">
                    <div className="row">
                        <div className="col-md-12">
                            <div className="add-customer-header">
                                <h2 className="add-customer-title">
                                    {params.id ? "Edit Customer" : "Add New Customer"}
                                </h2>
                            </div>

                            <Tabs
                                activeKey={activeTab}
                                onChange={handleTabChange}
                                items={tabItems}
                                size="large"
                                type="card"
                                className="custom-tabs"
                            />

                            {/* Map Modal */}
                           {/* ... inside your return statement ... */}

<Modal
    title="Select Location"
    open={mapModalVisible}
    onOk={handleMapModalOk}
    onCancel={() => setMapModalVisible(false)}
    width={800}
    footer={[
        <Button key="back" onClick={() => setMapModalVisible(false)}>
            Cancel
        </Button>,
        <Button 
            key="current" 
            onClick={handleGetCurrentLocation}
            style={{ marginRight: '8px' }}
        >
            Current Location
        </Button>,
        <Button 
            key="submit" 
            type="primary" 
            onClick={handleMapModalOk}
        >
            Confirm Location
        </Button>,
    ]}
>
    {/* NEW GOOGLE MAPS CODE STARTS HERE */}
    <LoadScript googleMapsApiKey="AIzaSyBtk7IX-LndHF99lKR4JF6HPKGz6gFyTOM">
        <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={mapCenter}
            zoom={15}
            onClick={handleMapClick}
        >
            {/* Show marker if a location is selected */}
            {selectedLocation && (
                <Marker
                    position={{ 
                        lat: parseFloat(selectedLocation.lat), 
                        lng: parseFloat(selectedLocation.lng) 
                    }}
                />
            )}
        </GoogleMap>
    </LoadScript>
    
    <div style={{ marginTop: '10px', padding: '10px', background: '#f5f5f5', borderRadius: '4px' }}>
        <strong>Selected Coordinates: </strong>
        {selectedLocation ? (
            <span>{selectedLocation.lat}, {selectedLocation.lng}</span>
        ) : (
            <span style={{ color: '#999' }}>Click on the map to select</span>
        )}
    </div>
    {/* NEW GOOGLE MAPS CODE ENDS HERE */}
</Modal>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default AddCustomer;