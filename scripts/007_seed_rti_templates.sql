-- Seed RTI templates for different departments
INSERT INTO rti_templates (name, department, description, template_text) VALUES
(
  'Public Works Department (PWD)',
  'pwd',
  'For road, bridge, and infrastructure projects',
  'To,
The Public Information Officer,
Public Works Department,
{authority_address}

Subject: Application under Right to Information Act, 2005

Sir/Madam,

I, {applicant_name}, hereby request the following information under the Right to Information Act, 2005:

{information_requested}

I am willing to pay the prescribed fee for obtaining this information. Please provide the information within the stipulated time frame of 30 days as per Section 7(1) of the RTI Act, 2005.

Thanking you,

{applicant_name}
{applicant_address}
Date: {date}'
),
(
  'Municipal Corporation',
  'municipal',
  'For urban development, drainage, and city infrastructure',
  'To,
The Public Information Officer,
Municipal Corporation,
{authority_address}

Subject: Request for Information under RTI Act, 2005

Respected Sir/Madam,

Under the provisions of Right to Information Act, 2005, I request the following information:

{information_requested}

The requisite fee of ₹10/- is being paid via {payment_method}.

Kindly provide the requested information within the statutory period.

Yours faithfully,

{applicant_name}
{applicant_address}
Contact: {applicant_phone}
Date: {date}'
),
(
  'Water Supply Department',
  'water',
  'For water supply and sanitation projects',
  'To,
The Public Information Officer,
Water Supply & Sanitation Department,
{authority_address}

Subject: Application for Information under RTI Act, 2005

Sir/Madam,

I request the following information pertaining to water supply infrastructure:

{information_requested}

Please provide certified copies of relevant documents. I am prepared to pay additional copying charges as applicable.

{applicant_name}
{applicant_address}
Date: {date}'
),
(
  'Electricity Department',
  'electrical',
  'For electrical infrastructure projects',
  'To,
The Public Information Officer,
State Electricity Board / Distribution Company,
{authority_address}

Subject: RTI Application regarding Electrical Infrastructure

Sir/Madam,

Under the Right to Information Act, 2005, I seek the following information:

{information_requested}

The application fee is enclosed herewith.

{applicant_name}
{applicant_address}
Date: {date}'
),
(
  'General Infrastructure',
  'general',
  'Generic template for other departments',
  'To,
The Public Information Officer,
{department_name},
{authority_address}

Subject: Application under Right to Information Act, 2005

Sir/Madam,

I hereby submit this application under the Right to Information Act, 2005, seeking the following information:

{information_requested}

I request that the information be provided within the statutory time limit of 30 days. The prescribed fee is being paid as per rules.

Yours faithfully,

{applicant_name}
{applicant_address}
Contact: {applicant_phone}
Date: {date}'
);
