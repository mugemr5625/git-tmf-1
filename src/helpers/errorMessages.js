// helpers/errorMessages.js or constants/errorMessages.js

export const ERROR_MESSAGES = {
  // Area Error Messages
  AREA: {
    BRANCH_REQUIRED: "Branch is required",
    LINE_REQUIRED: "Line is required",
    AREA_NAME_REQUIRED: "Area Name is required",
    CREATE_FAILED: "The area is not created. Please try again",
    UPDATE_FAILED: "The area is not updated. Please try again",
    OPERATION_FAILED: "The area is not created.",
  },

  // Branch Error Messages
  BRANCH: {
    BRANCH_NAME_REQUIRED: "Please enter branch name",
    BRANCH_ADDRESS_REQUIRED: "Please enter branch address",
    AGREEMENT_CERTIFICATE_REQUIRED: "Agreement certificate is required",
    AGREEMENT_DESCRIPTION_REQUIRED: "Description is required",
    FILE_REQUIRED: "File required",
    FILE_DESCRIPTION_REQUIRED: "Description required",
    UPLOAD_FAILED: "upload failed",
    OPERATION_FAILED: "Operation Failed",
  },

  // Investment Error Messages
  INVESTMENT: {
    TITLE_REQUIRED: "Please enter an investment title",
    TITLE_PATTERN: "Investment title must start with an alphabet and can only contain alphanumeric characters, '-' or '_'",
    USER_REQUIRED: "Please select a user",
    BRANCH_REQUIRED: "Please select a branch",
    LINE_REQUIRED: "Please select a line",
    AMOUNT_REQUIRED: "Please enter an amount",
    AMOUNT_MIN: "Amount must be greater than 0",
    PAYMENT_MODE_REQUIRED: "Please select a payment mode",
    DATE_REQUIRED: "Please select a date",
    ADD_FAILED: "Failed to add investment",
    UPDATE_FAILED: "Failed to update investment",
    OPERATION_ERROR: "An error occurred",
  },

  // Line Error Messages
  LINE: {
    BRANCH_REQUIRED: "Branch is required",
    LINE_NAME_REQUIRED: "Line Name is required",
    LINE_TYPE_REQUIRED: "Line Type is required",
    INSTALLMENT_REQUIRED: "Installment is required",
    BAD_INSTALLMENT_REQUIRED: "No of bad installments is required",
    CREATE_FAILED: "Line is not created. Please try again",
    UPDATE_FAILED: "Line is not updated. Please try again",
    OPERATION_FAILED: "The line is not created.",
  },

  // Common Error Messages
  COMMON: {
    FIELD_REQUIRED: "This field is required!",
    OPERATION_FAILED: "Operation failed. Please try again",
    NETWORK_ERROR: "Network error. Please check your connection",
    UNAUTHORIZED: "You are not authorized to perform this action",
    SERVER_ERROR: "Server error. Please try again later",
  },
};

// Success Messages
export const SUCCESS_MESSAGES = {
  // Area Success Messages
  AREA: {
    CREATED: "The area has been created successfully.",
    UPDATED: "The area has been updated successfully.",
    DELETED: "The area has been deleted successfully.",
  },

  // Branch Success Messages
  BRANCH: {
    CREATED: "Branch added successfully",
    UPDATED: "Branch updated successfully",
    DELETED: "Branch deleted successfully",
    FILE_UPLOADED: "uploaded successfully",
  },

  // Investment Success Messages
  INVESTMENT: {
    CREATED: "Investment details has been added successfully",
    UPDATED: "Investment details has been updated successfully",
    DELETED: "Investment has been deleted successfully",
  },

  // Line Success Messages
  LINE: {
    CREATED: "The line has been created successfully.",
    UPDATED: "The line has been updated successfully.",
    DELETED: "The line has been deleted successfully.",
  },

  // Common Success Messages
  COMMON: {
    OPERATION_SUCCESS: "Operation completed successfully",
    SAVE_SUCCESS: "Data saved successfully",
    DELETE_SUCCESS: "Data deleted successfully",
  },
};

// Notification Titles
export const NOTIFICATION_TITLES = {
  AREA: "Area",
  BRANCH: "Branch",
  INVESTMENT: "Investment",
  LINE: "Line",
  SUCCESS: "Success",
  ERROR: "Error",
  WARNING: "Warning",
  INFO: "Information",
};

// File Upload Messages
export const FILE_MESSAGES = {
  UPLOAD_SUCCESS: "uploaded successfully",
  UPLOAD_FAILED: "upload failed",
  REMOVE_SUCCESS: "File removed successfully",
  INVALID_FORMAT: "Invalid file format",
  SIZE_EXCEEDED: "File size exceeds limit",
};

export default {
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  NOTIFICATION_TITLES,
  FILE_MESSAGES,
};