import '../sass/viewInvoiceStyles.scss';

import { BigNumber, utils } from 'ethers';
import React, { useContext, useEffect, useState } from 'react';

import { DepositFunds } from '../components/DepositFunds';
import { Loader } from '../components/Loader';
import { LockFunds } from '../components/LockFunds';
import { ReleaseFunds } from '../components/ReleaseFunds';
import { Web3Context } from '../context/Web3Context';
import { getInvoice } from '../graphql/getInvoice';
import { balanceOf } from '../utils/erc20';
import { getDateString, getResolverString, getToken } from '../utils/helpers';
import { release } from '../utils/invoice';

export const ViewInvoice = ({
  match: {
    params: { invoiceId },
  },
}) => {
  const { provider } = useContext(Web3Context);
  const [invoice, setInvoice] = useState();
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [releaseLoading, setReleaseLoading] = useState(false);
  const [balance, setBalance] = useState(BigNumber.from(0));
  const [modal, setModal] = useState(false);
  const [selected, setSelected] = useState(0);

  const onLock = () => {
    setSelected(0);
    setModal(true);
  };

  const onDeposit = () => {
    setSelected(1);
    setModal(true);
  };
  const onRelease = async () => {
    if (
      !releaseLoading &&
      !balanceLoading &&
      provider &&
      invoice &&
      balance &&
      balance.gte(invoice.amounts[invoice.currentMilestone])
    ) {
      setReleaseLoading(true);
      const tx = await release(provider, invoice.address);
      await tx.wait();
      setReleaseLoading(false);
      window.location.href = `/invoice/${invoiceId}`;
    }
  };

  useEffect(() => {
    if (invoiceId >= 0) {
      getInvoice(invoiceId).then(i => setInvoice(i));
    }
  }, [invoiceId]);

  useEffect(() => {
    if (invoice && provider) {
      setBalanceLoading(true);
      balanceOf(provider, invoice.token, invoice.address)
        .then(b => {
          setBalance(b);
          setBalanceLoading(false);
        })
        // eslint-disable-next-line no-console
        .catch(balanceError => console.error({ balanceError }));
    }
  }, [invoice, provider]);

  if (!invoice || balanceLoading) {
    return (
      <div className="main overlay">
        <div className="view-invoice">
          <Loader size="80" />
        </div>
      </div>
    );
  }

  const {
    projectName,
    projectDescription,
    projectAgreement,
    startDate,
    endDate,
    terminationTime,
    resolverType,
    // numMilestones,
    currentMilestone,
    amounts,
    total,
    token,
    released,
  } = invoice;

  const { decimals, symbol } = getToken(token);
  const deposited = BigNumber.from(released).add(balance);
  const due = BigNumber.from(total).sub(deposited);
  const amount = BigNumber.from(amounts[currentMilestone]);
  const isReleasable = amount.lte(balance);

  return (
    <div className="main overlay">
      <div className="view-invoice">
        <div className="project-info">
          <div>
            <h3 id="title">{projectName}</h3>
            <h5 id="description">{projectDescription}</h5>
            <a
              href={projectAgreement}
              target="_blank"
              rel="noopener noreferrer"
            >
              Link to details of agreement
            </a>
          </div>
          <div id="right-col">
            <p>Project Start Date: {getDateString(startDate)}</p>
            <p>Project End Date: {getDateString(endDate)}</p>
            <p>
              Safety Valve Withdrawal Date: {getDateString(terminationTime)}
            </p>
            <p>Arbitration Provider: {getResolverString(resolverType)}</p>
          </div>
        </div>
        <div className="payment-info-container">
          <div className="payment-info">
            <div id="total-amount">
              <p>Total Project Amount</p>
              <p>{`${utils.formatUnits(total, decimals)} ${symbol}`}</p>
            </div>
            <div id="payment-milestone">
              {amounts.map((amt, index) => (
                <div key={index.toString()}>
                  <p>Project Milestone #{index + 1}</p>
                  <p>{`${utils.formatUnits(amt, decimals)} ${symbol}`}</p>
                </div>
              ))}
            </div>
            <hr className="hr-line" />
            <div id="deposited-amount">
              <div>
                <p>Total Deposited</p>
                <p>{`${utils.formatUnits(deposited, decimals)} ${symbol}`}</p>
              </div>
              <div>
                <p>Remaining Amount Due</p>
                <p>{`${utils.formatUnits(due, decimals)} ${symbol}`}</p>
              </div>
            </div>
            <hr className="hr-line" />
            <div id="due-amount">
              <p>
                {isReleasable ? 'Next Amount to Release' : 'Total Due Today'}
              </p>
              <p>{`${utils.formatUnits(
                isReleasable ? amount : amount.sub(balance),
                decimals,
              )} ${symbol}`}</p>
            </div>
          </div>
          <div className="invoice-buttons">
            <div id="secondary-buttons">
              <button id="lock-button" onClick={() => onLock()} type="button">
                Lock
              </button>
              <button
                id="deposit-button"
                onClick={() => onDeposit()}
                type="button"
              >
                Deposit
              </button>
            </div>
            <button
              id="primary-button"
              onClick={() => onRelease()}
              type="button"
            >
              {releaseLoading ? 'Loading...' : 'Release'}
            </button>
          </div>
        </div>
        <div className={`modal ${modal ? 'is-active' : null}`}>
          <div className="modal-background" />
          <div className="modal-content">
            <button
              type="button"
              className="modal-close is-large"
              aria-label="close"
              onClick={() => setModal(false)}
            />
            {modal && selected === 0 && (
              <LockFunds
                invoice={invoice}
                balance={balance}
                close={() => setModal(false)}
              />
            )}
            {modal && selected === 1 && (
              <DepositFunds
                invoice={invoice}
                balance={balance}
                close={() => setModal(false)}
              />
            )}
            {modal && selected === 2 && (
              <ReleaseFunds
                invoice={invoice}
                balance={balance}
                close={() => setModal(false)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};