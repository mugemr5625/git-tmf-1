import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Select, Form, Input, Button, Switch, message, Divider, Space } from "antd";
import {
  ArrowLeftOutlined,
  ReloadOutlined,
  BankOutlined,
  ApartmentOutlined,
  DollarOutlined,
  PlusOutlined,
  MinusOutlined,
} from "@ant-design/icons";
import {
  ADD_BRANCH,
  LINE,
  USERS,
  EXPANSE_AUTOCOMPLETE,
  AREA, // Add this to your url_helper
} from "helpers/url_helper";
import { GET, POST, PUT } from "helpers/api_helper";
import Loader from "components/Common/Loader";
import { debounce } from "lodash";

const { Option } = Select;

const AddUser = () => {
  const [loading, setLoading] = useState(false);
  const [branchLoader, setBranchLoader] = useState(false);
  const [lineLoader, setLineLoader] = useState(false);
  const [areaData, setAreaData] = useState([]); // Store all area data
  const [branchList, setBranchList] = useState([]);
  const [lineList, setLineList] = useState([]); // All lines
  const [filteredLineList, setFilteredLineList] = useState([]); // Lines filtered by selected branches
  const [baseLineList, setBaseLineList] = useState([]); // Lines filtered by base branch
  const [isEditMode, setIsEditMode] = useState(false);
  const [initialValues, setInitialValues] = useState({});
  const [expenseOptions, setExpenseOptions] = useState([]);
  const [expenseLoading, setExpenseLoading] = useState(false);
  const [userRole, setUserRole] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [expenseMappings, setExpenseMappings] = useState([{ id: Date.now(), lineId: null, expanses: [] }]);
  const [currentUsername, setCurrentUsername] = useState("");
  const [selectedBranches, setSelectedBranches] = useState([]); // Track selected branches
  const [selectedBaseBranch, setSelectedBaseBranch] = useState(null); // Track selected base branch

  const navigate = useNavigate();
  const params = useParams();
  const userId = params.id;
  const [form] = Form.useForm();

  // Get logged-in user role and username from localStorage
  useEffect(() => {
    const role = localStorage.getItem("user_role");
    const username = localStorage.getItem("username") || localStorage.getItem("user_name");
    if (role) {
      setUserRole(role);
    }
    if (username) {
      setCurrentUsername(username);
    }
  }, []);

  const debouncedSearch = useMemo(
    () =>
      debounce(async (searchValue) => {
        if (!searchValue) {
          setExpenseOptions([]);
          return;
        }

        setExpenseLoading(true);
        try {
          const response = await GET(`${EXPANSE_AUTOCOMPLETE}?value=${searchValue}`);
          if (response.status === 200) {
            setExpenseOptions(
              response.data.map((item) => ({ value: item.id, label: item.name }))
            );
          } else {
            message.error("Failed to fetch expenses");
            setExpenseOptions([]);
          }
        } catch (error) {
          console.error("Error fetching expenses:", error);
          message.error("Error fetching expenses");
          setExpenseOptions([]);
        } finally {
          setExpenseLoading(false);
        }
      }, 300),
    []
  );

  // Fetch area data (which contains branch and line information)
  useEffect(() => {
    const fetchAreaData = async () => {
      try {
        setBranchLoader(true);
        setLineLoader(true);
        const [areaResponse, expenseResponse] = await Promise.all([
          GET(AREA),
          GET(EXPANSE_AUTOCOMPLETE),
        ]);

        if (areaResponse?.status === 200) {
          const areas = areaResponse.data;
          setAreaData(areas);

          // Extract unique branches from area data
          const uniqueBranches = [...new Set(areas.map(item => item.branch_name))];
          const branches = uniqueBranches.map((branchName, index) => ({
            id: areas.find(item => item.branch_name === branchName)?.branch || index,
            branch_name: branchName,
          }));
          setBranchList(branches);

          // Extract unique lines from area data
          const uniqueLines = [...new Set(areas.map(item => item.line_name))];
          const lines = uniqueLines.map((lineName, index) => ({
            id: areas.find(item => item.line_name === lineName)?.line || index,
            lineName: lineName,
          }));
          setLineList(lines);
          setFilteredLineList(lines); // Initially show all lines
          setBaseLineList([]); // Base line list starts empty until base branch is selected
        }

        if (expenseResponse?.status === 200) {
          setExpenseOptions(
            expenseResponse.data.map((item) => ({
              value: item.id,
              label: item.name,
            }))
          );
        }
      } catch (error) {
        console.error("Error fetching area data:", error);
        message.error("Failed to load area data");
        setBranchList([]);
        setLineList([]);
        setAreaData([]);
      } finally {
        setBranchLoader(false);
        setLineLoader(false);
      }
    };
    fetchAreaData();
  }, []);

  // Filter lines based on selected branches (for User Role Assignment)
  const handleBranchChange = (selectedBranchIds) => {
    setSelectedBranches(selectedBranchIds);
    
    if (!selectedBranchIds || selectedBranchIds.length === 0) {
      // If no branches selected, clear the filtered list
      setFilteredLineList([]);
      return;
    }

    // Get branch names from selected IDs
    const selectedBranchNames = branchList
      .filter(branch => selectedBranchIds.includes(branch.id))
      .map(branch => branch.branch_name);

    // Filter area data by selected branches
    const filteredAreas = areaData.filter(area => 
      selectedBranchNames.includes(area.branch_name)
    );

    // Extract unique lines from filtered areas
    const uniqueLineNames = [...new Set(filteredAreas.map(item => item.line_name))];
    const filteredLines = lineList.filter(line => 
      uniqueLineNames.includes(line.lineName)
    );

    setFilteredLineList(filteredLines);

    // Clear line selections that are no longer valid
    const currentLineIds = form.getFieldValue('lineId') || [];
    const validLineIds = currentLineIds.filter(lineId => 
      filteredLines.some(line => line.id === lineId)
    );
    
    if (validLineIds.length !== currentLineIds.length) {
      form.setFieldsValue({ lineId: validLineIds });
    }

    // Update expense mappings to remove invalid lines
    const updatedMappings = expenseMappings.map(mapping => {
      if (mapping.lineId && !filteredLines.some(line => line.id === mapping.lineId)) {
        return { ...mapping, lineId: null, expanses: [] };
      }
      return mapping;
    });
    setExpenseMappings(updatedMappings);
  };

  // Filter base lines based on selected base branch
// Filter base lines based on selected base branch
  const handleBaseBranchChange = (selectedBranchId) => {
    setSelectedBaseBranch(selectedBranchId);
    
    if (!selectedBranchId) {
      // If no base branch selected, clear the base line list
      setBaseLineList([]);
      form.setFieldsValue({ baseLineId: null });
      return;
    }

    // Get branch name from selected ID
    const selectedBranch = branchList.find(branch => branch.id === selectedBranchId);
    if (!selectedBranch) {
      setBaseLineList([]);
      return;
    }

    console.log("Selected base branch:", selectedBranch.branch_name);
    console.log("All area data:", areaData);

    // Filter area data by selected base branch (case-insensitive and trim whitespace)
    const filteredAreas = areaData.filter(area => 
      area.branch_name?.trim().toLowerCase() === selectedBranch.branch_name?.trim().toLowerCase()
    );

    console.log("Filtered areas for base branch:", filteredAreas);

    // Extract unique lines from filtered areas
    const uniqueLineNames = [...new Set(filteredAreas.map(item => item.line_name).filter(Boolean))];
    const filteredLines = lineList.filter(line => 
      uniqueLineNames.some(lineName => 
        lineName?.trim().toLowerCase() === line.lineName?.trim().toLowerCase()
      )
    );

    console.log("Filtered base lines:", filteredLines);
    setBaseLineList(filteredLines);

    // Clear base line selection if it's no longer valid
    const currentBaseLineId = form.getFieldValue('baseLineId');
    if (currentBaseLineId && !filteredLines.some(line => line.id === currentBaseLineId)) {
      form.setFieldsValue({ baseLineId: null });
    }
  };

  useEffect(() => {
    if (userId) {
      console.log("User ID:", userId);
      const fetchUserData = async () => {
        try {
          setLoading(true);
          const response = await GET(`${USERS}${userId}`);
          if (response) {
            const userData = response.data;
            
            // Extract branch IDs from line_allocations
            const branchIds = userData.line_allocations 
              ? [...new Set(userData.line_allocations.map(allocation => allocation.branch))]
              : [];
            
            // Extract line IDs from line_allocations
            const lineIds = userData.line_allocations 
              ? userData.line_allocations.map(allocation => allocation.line)
              : [];
            
            // Set form values with the correct field names
            form.setFieldsValue({
              full_name: userData.full_name,
              username: userData.username,
              mobile_number: userData.mobile_number,
              email: userData.email,
              address: userData.address,
              pin_code: userData.pin_code,
              role: userData.role,
              baseBranchId: userData.base_branch || null, // Add base branch
              baseLineId: userData.base_line || null, // Add base line
              branchId: branchIds,
              lineId: lineIds,
              allowTransaction: userData.allow_old_transaction,
            });

            setInitialValues(userData);
            setSelectedRole(userData.role);
            setSelectedBranches(branchIds);
            setSelectedBaseBranch(userData.base_branch);
            setIsEditMode(true);

            // Filter lines based on selected branches for edit mode
            if (branchIds.length > 0) {
              handleBranchChange(branchIds);
            }

            // Filter base lines based on selected base branch for edit mode
            if (userData.base_branch) {
              handleBaseBranchChange(userData.base_branch);
            }

            // Transform user_expenses and line_allocations back to expenseMappings format
            if (userData.line_allocations && userData.line_allocations.length > 0) {
              const mappingsMap = new Map();
              
              // Get all expense IDs from user_expenses
              const allExpenseIds = userData.user_expenses 
                ? userData.user_expenses.map(exp => exp.expense) 
                : [];
              
              // Create mappings based on unique line IDs from line_allocations
              userData.line_allocations.forEach(allocation => {
                const lineId = allocation.line;
                if (!mappingsMap.has(lineId)) {
                  mappingsMap.set(lineId, {
                    id: Date.now() + Math.random(),
                    lineId: lineId,
                    // All expenses are shared across all lines in the current API structure
                    expanses: [...allExpenseIds]
                  });
                }
              });

              const mappings = Array.from(mappingsMap.values());
              setExpenseMappings(mappings.length > 0 ? mappings : [{ id: Date.now(), lineId: null, expanses: [] }]);
            } else if (userData.user_expenses && userData.user_expenses.length > 0) {
              const expenseIds = userData.user_expenses.map(exp => exp.expense);
              setExpenseMappings([{ 
                id: Date.now(), 
                lineId: null, 
                expanses: expenseIds 
              }]);
            } else {
              setExpenseMappings([{ id: Date.now(), lineId: null, expanses: [] }]);
            }
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          message.error("Failed to load user data");
        } finally {
          setLoading(false);
        }
      };
      fetchUserData();
    }
  }, [userId, form]);

  const handleBack = useCallback(() => {
    if (form.isFieldsTouched()) {
      if (
        window.confirm(
          "You have unsaved changes. Are you sure you want to leave?"
        )
      ) {
        navigate("/user/list");
      }
    } else {
      navigate("/user/list");
    }
  }, [navigate, form]);

  // Handle role change to show/hide fields
  const handleRoleChange = (value) => {
    setSelectedRole(value);
    if (value === "owner") {
      form.setFieldsValue({ lineId: undefined });
    }
  };

  // Add new expense mapping
  const addExpenseMapping = () => {
    setExpenseMappings([...expenseMappings, { id: Date.now(), lineId: null, expanses: [] }]);
  };

  // Remove expense mapping
  const removeExpenseMapping = (index) => {
    if (expenseMappings.length > 1) {
      setExpenseMappings(expenseMappings.filter((_, i) => i !== index));
    } else {
      message.warning("At least one expense mapping is required");
    }
  };

  // Update expense mapping
  const updateExpenseMapping = (id, field, value) => {
    setExpenseMappings(expenseMappings.map(mapping => 
      mapping.id === id ? { ...mapping, [field]: value } : mapping
    ));
  };

  // Handle form submission
  const onFinish = async (values) => {
    console.log("Form submitted with values:", values);
    console.log("Expense Mappings:", expenseMappings);
    
    // Validate expense mappings
    const hasInvalidMapping = expenseMappings.some(
      mapping => !mapping.lineId || !mapping.expanses || mapping.expanses.length === 0
    );
    
    if (hasInvalidMapping) {
      message.error("Please complete all expense mappings with both line and expenses");
      return;
    }

    setLoading(true);

    // Collect all unique line IDs from expense mappings
    const lineIds = [...new Set(expenseMappings.map(mapping => mapping.lineId))];
    
    // Collect all unique expense IDs from expense mappings
    const allExpenseIds = [...new Set(
      expenseMappings
        .filter(mapping => mapping.expanses && mapping.expanses.length > 0)
        .flatMap(mapping => mapping.expanses)
    )];

    // Build the payload matching the tested POST structure
    const payload = {
      username: values.username,
      full_name: values.full_name,
      mobile_number: values.mobile_number,
      email: values.email || "",
      address: values.address || "",
      pin_code: values.pin_code || "",
      role: values.role,
      allow_old_transaction: values.allowTransaction || false,
      base_branch: values.baseBranchId || null, // Add base branch to payload
      base_line: values.baseLineId || null, // Add base line to payload
      branchId: values.branchId || [],
      lineId: lineIds,
      areaId: [],
      expanses: allExpenseIds
    };

    // Add password only if provided (for both create and update)
    if (values.password) {
      payload.password = values.password;
    }

    console.log("Payload to send:", payload);

    try {
      if (isEditMode) {
        const response = await PUT(`${USERS}${userId}/`, payload);
        if (response) {
          message.success("User updated successfully");
          navigate("/user/list");
        }
      } else {
        const response = await POST(USERS, payload);

        if (response?.status === 200 || response?.status === 201) {
          message.success("User added successfully");
          form.resetFields();
          setExpenseMappings([{ id: Date.now(), lineId: null, expanses: [] }]);
          navigate("/user/list");
        } else if (response?.status === 400) {
          const errorMessage =
            response?.data?.mobile_number ||
            response?.data?.email ||
            "User not created";
          message.error(errorMessage);
        }
      }
    } catch (error) {
      console.error("Error adding/updating user:", error);
      message.error(error?.response?.data?.message || "Failed to add/update user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {loading && <Loader />}
      <div className="add-user-page-content">
        <div className="add-user-container-fluid">
          <div className="row">
            <div className="col-md-12">
              <div className="add-user-header">
                <h2 className="add-user-title">
                  {isEditMode ? "Edit User" : "Add User"}
                </h2>
              </div>

              <Form
                layout="vertical"
                onFinish={onFinish}
                form={form}
                initialValues={initialValues}
                className="add-user-form"
              >
                <div className="container add-user-form-container">
                  {/* Full Name and User Name */}
                  <div className="row mb-2">
                    <div className="col-md-6">
                      <Form.Item
                        label="Full Name"
                        name="full_name"
                        rules={[
                          {
                            required: true,
                            message: "Please enter the full name",
                          },
                        ]}
                      >
                        <Input placeholder="Enter full name" size="large" />
                      </Form.Item>
                    </div>
                    <div className="col-md-6">
                      <Form.Item
                        label="User Name"
                        name="username"
                        rules={[
                          {
                            required: true,
                            message: "Please enter the user name",
                          },
                        ]}
                      >
                        <Input placeholder="Enter user name" size="large" />
                      </Form.Item>
                    </div>
                  </div>

                  {/* Password and Confirm Password */}
                  <div className="row mb-2">
                    <div className="col-md-6">
                      <Form.Item
                        label="Password"
                        name="password"
                        rules={[
                          {
                            required: !isEditMode,
                            message: "Please enter the password",
                          },
                        ]}
                      >
                        <Input.Password
                          placeholder="Enter password"
                          size="large"
                        />
                      </Form.Item>
                    </div>
                    <div className="col-md-6">
                      <Form.Item
                        label="Confirm Password"
                        name="confirmPassword"
                        dependencies={["password"]}
                        rules={[
                          {
                            required: !isEditMode,
                            message: "Please confirm the password",
                          },
                          ({ getFieldValue }) => ({
                            validator(_, value) {
                              return !value ||
                                getFieldValue("password") === value
                                ? Promise.resolve()
                                : Promise.reject(
                                    new Error("Passwords do not match!")
                                  );
                            },
                          }),
                        ]}
                      >
                        <Input.Password
                          placeholder="Confirm password"
                          size="large"
                        />
                      </Form.Item>
                    </div>
                  </div>

                  {/* Mobile Number and Email */}
                  <div className="row mb-2">
                    <div className="col-md-6">
                      <Form.Item
                        label="Mobile Number"
                        name="mobile_number"
                        rules={[
                          {
                            required: true,
                            message: "Please enter the mobile number",
                          },
                          {
                            pattern: /^\d{10}$/,
                            message: "Mobile number must be 10 digits!",
                          },
                        ]}
                      >
                        <Input placeholder="Enter mobile number" size="large" />
                      </Form.Item>
                    </div>
                    <div className="col-md-6">
                      <Form.Item
                        label="Email ID"
                        name="email"
                        rules={[
                          {
                            type: "email",
                            message: "Please enter a valid email",
                          },
                        ]}
                      >
                        <Input placeholder="Enter email ID" size="large" />
                      </Form.Item>
                    </div>
                  </div>

                  {/* Address and Pincode */}
                  <div className="row mb-2">
                    <div className="col-md-6">
                      <Form.Item label="Address" name="address">
                        <Input.TextArea
                          rows={1}
                          placeholder="Enter the address"
                          size="large"
                        />
                      </Form.Item>
                    </div>
                    <div className="col-md-6">
                      <Form.Item
                        label="Pincode"
                        name="pin_code"
                        rules={[
                          {
                            pattern: /^\d{6}$/,
                            message: "Pincode must be 6 digits!",
                          },
                        ]}
                      >
                        <Input placeholder="Enter the pincode" size="large" />
                      </Form.Item>
                    </div>
                  </div>

                  <Divider style={{ borderTop: "2px solid #d9d9d9" }} />

                  {/* Base Branch and Base Line Section */}
                  <Divider orientation="center">Base Assignment</Divider>
                  
                  <div className="row mb-2">
                    <div className="col-md-6">
                      <Form.Item
                        label="Base Branch"
                        name="baseBranchId"
                        rules={[
                          { required: true, message: "Please select a base branch" },
                        ]}
                      >
                        <Select
                          placeholder="Select base branch"
                          showSearch
                          size="large"
                          loading={branchLoader}
                          suffixIcon={<BankOutlined />}
                          onChange={handleBaseBranchChange}
                        >
                          {branchList?.map((branch) => (
                            <Option key={branch.id} value={branch.id}>
                              {branch.branch_name}
                            </Option>
                          ))}
                        </Select>
                      </Form.Item>
                    </div>
                    <div className="col-md-6">
                      <Form.Item
                        label="Base Line"
                        name="baseLineId"
                        rules={[
                          { required: true, message: "Please select a base line" },
                        ]}
                      >
                        <Select
                          placeholder={selectedBaseBranch ? "Select base line" : "Select base branch first"}
                          showSearch
                          size="large"
                          loading={lineLoader}
                          suffixIcon={<ApartmentOutlined />}
                          disabled={!selectedBaseBranch}
                        >
                          {baseLineList.map((option) => (
                            <Option key={option.id} value={option.id}>
                              {option.lineName}
                            </Option>
                          ))}
                        </Select>
                      </Form.Item>
                    </div>
                  </div>

                  <Divider style={{ borderTop: "2px solid #d9d9d9" }} />

                  {/* User Role & Assignment Section */}
                  <Divider orientation="center">User Role & Assignment</Divider>
                  
                  <div className="row mb-2">
                    <div className="col-md-6">
                      <Form.Item
                        label="Role"
                        name="role"
                        rules={[
                          { required: true, message: "Please select a role" },
                        ]}
                      >
                        <Select
                          placeholder="Choose User Role"
                          showSearch
                          size="large"
                          onChange={handleRoleChange}
                        >
                          <Option value="owner">Owner</Option>
                          <Option value="manager">Manager</Option>
                          <Option value="agent">Agent</Option>
                        </Select>
                      </Form.Item>
                    </div>
                    <div className="col-md-6">
                      <Form.Item
                        label="Branch"
                        name="branchId"
                        rules={[
                          { required: true, message: "Please select a branch" },
                        ]}
                      >
                        <Select
                          placeholder="Select branch"
                          showSearch
                          size="large"
                          loading={branchLoader}
                          mode="multiple"
                          suffixIcon={<BankOutlined />}
                          onChange={handleBranchChange}
                        >
                          {branchList?.map((branch) => (
                            <Option key={branch.id} value={branch.id}>
                              {branch.branch_name}
                            </Option>
                          ))}
                        </Select>
                      </Form.Item>
                    </div>
                  </div>

                  {selectedRole && selectedRole === "agent" && (
                    <div className="row mb-2">
                      <div className="col-md-6">
                        <Form.Item
                          label="Line"
                          name="lineId"
                          rules={[
                            { required: true, message: "Please select a line" },
                          ]}
                        >
                          <Select
                            placeholder={selectedBranches.length > 0 ? "Select Line" : "Select branches first"}
                            showSearch
                            size="large"
                            loading={lineLoader}
                            mode="multiple"
                            suffixIcon={<ApartmentOutlined />}
                            disabled={!selectedBranches || selectedBranches.length === 0}
                          >
                            {filteredLineList.map((option) => (
                              <Option key={option.id} value={option.id}>
                                {option.lineName}
                              </Option>
                            ))}
                          </Select>
                        </Form.Item>
                      </div>
                      <div className="col-md-6">
                        <Form.Item
                          label="Allow to see old Transaction?"
                          name="allowTransaction"
                          valuePropName="checked"
                        >
                          <Switch
                            checkedChildren="Yes"
                            unCheckedChildren="No"
                            defaultChecked
                          />
                        </Form.Item>
                      </div>
                    </div>
                  )}

                  {selectedRole && (selectedRole === "owner" || selectedRole === "manager") && (
                    <div className="row mb-2">
                      <div className="col-md-6">
                        <Form.Item
                          label="Allow to see old Transaction?"
                          name="allowTransaction"
                          valuePropName="checked"
                        >
                          <Switch
                            checkedChildren="Yes"
                            unCheckedChildren="No"
                            defaultChecked
                          />
                        </Form.Item>
                      </div>
                    </div>
                  )}

                  <Divider style={{ borderTop: "2px solid #d9d9d9" }} />

                  {/* User Expense Mapping Section */}
                  <Divider orientation="center">User Expense Mapping</Divider>
                  
                  {expenseMappings.map((mapping, index) => (
                    <div key={mapping.id} className="row mb-4">
                      {expenseMappings.length > 1 && (
                        <Divider orientation="center">
                          {`Expense Mapping ${index + 1}`}
                        </Divider>
                      )}
                      
                      <div className="col-md-6">
                        <Form.Item
                          label="Line Name"
                          required
                        >
                          <Select
                            placeholder={selectedBranches.length > 0 ? "Select Line" : "Select branches first"}
                            showSearch
                            size="large"
                            loading={lineLoader}
                            value={mapping.lineId}
                            onChange={(value) => updateExpenseMapping(mapping.id, 'lineId', value)}
                            suffixIcon={<ApartmentOutlined />}
                            disabled={!selectedBranches || selectedBranches.length === 0}
                          >
                            {filteredLineList.map((option) => (
                              <Option key={option.id} value={option.id}>
                                {option.lineName}
                              </Option>
                            ))}
                          </Select>
                        </Form.Item>
                      </div>
                      
                      <div className="col-md-6">
                        <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                          <Form.Item
                            label="User Expense Type"
                            required
                            style={{ flexGrow: 1 }}
                          >
                            <Select
                              mode="multiple"
                              placeholder="Search and select expenses"
                              onSearch={debouncedSearch}
                              value={mapping.expanses}
                              onChange={(value) => updateExpenseMapping(mapping.id, 'expanses', value)}
                              filterOption={false}
                              loading={expenseLoading}
                              showSearch
                              allowClear
                              size="large"
                              suffixIcon={<DollarOutlined />}
                              notFoundContent={
                                expenseLoading ? "Loading..." : "No expenses found"
                              }
                            >
                              {expenseOptions.map((option) => (
                                <Option key={option.value} value={option.value}>
                                  {option.label}
                                </Option>
                              ))}
                            </Select>
                          </Form.Item>

                          {/* Minus Button */}
                          {index > 0 && (
                            <Button
                              type="primary"
                              danger
                              shape="circle"
                              icon={<MinusOutlined />}
                              onClick={() => removeExpenseMapping(index)}
                              style={{
                                width: 33,
                                height: 33,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                backgroundColor: "#ff4d4f",
                                borderColor: "#ff4d4f",
                                color: "#fff",
                                marginTop: "30px",
                                flexShrink: 0
                              }}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Add button at the bottom */}
                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "-15px" }}>
                    <Button
                      type="primary"
                      shape="circle"
                      icon={<PlusOutlined />}
                      onClick={addExpenseMapping}
                      style={{
                        width: 35,
                        height: 35,
                        backgroundColor: "#28a745",
                        borderColor: "#28a745",
                        color: "#fff",
                      }}
                    />
                  </div>

                  <Divider style={{ borderTop: "2px solid #d9d9d9" }} />

                  {/* Form Actions */}
                  <div className="text-center mt-4">
                    <Space size="large">
                      <Button type="primary" htmlType="submit" loading={loading} size="large">
                        {isEditMode ? "Update User" : "Add User"}
                      </Button>
                      <Button
                        size="large"
                        onClick={handleBack}
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
      </div>
    </>
  );
};

export default AddUser;